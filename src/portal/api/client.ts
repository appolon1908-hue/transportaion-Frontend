import { getRuntimeConfig } from '../config'
import type { ApiErrorPayload, FieldError } from './types'

export interface ApiRequestOptions {
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  idempotencyKey?: string
  expectedVersion?: number | string
  includeTenant?: boolean
  includeAuth?: boolean
  timeoutMs?: number
  retrySafeReads?: boolean
  signal?: AbortSignal
}

export interface ApiResponse<T> {
  data: T
  etag?: string
  correlationId?: string
  status: number
}

interface AuthHooks {
  getAccessToken: () => string | null
  getTenantId: () => string | null
  onUnauthorized: () => Promise<boolean>
}

const defaultHooks: AuthHooks = {
  getAccessToken: () => null,
  getTenantId: () => null,
  onUnauthorized: async () => false,
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string
  readonly fieldErrors: FieldError[]
  readonly retryAfterSeconds?: number
  readonly currentVersion?: number
  readonly blockers: unknown[]
  readonly warnings: unknown[]
  readonly payload: ApiErrorPayload

  constructor(status: number, payload: ApiErrorPayload, headers: Headers) {
    const code = typeof payload.code === 'string' ? payload.code : `HTTP_${status}`
    const message =
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message
        : 'The request could not be completed.'
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
    const correlation =
      (typeof payload.correlation_id === 'string' && payload.correlation_id) ||
      (typeof payload.correlationId === 'string' && payload.correlationId) ||
      headers.get('X-Correlation-Id') ||
      undefined
    if (correlation) this.correlationId = correlation
    this.fieldErrors = normalizeFieldErrors(payload.field_errors ?? payload.fields)
    const retryAfter = Number(headers.get('Retry-After'))
    if (Number.isFinite(retryAfter) && retryAfter >= 0) this.retryAfterSeconds = retryAfter
    const currentVersion = Number(payload.current_version ?? payload.currentVersion)
    if (Number.isInteger(currentVersion) && currentVersion >= 0) this.currentVersion = currentVersion
    this.blockers = Array.isArray(payload.blockers) ? payload.blockers : []
    this.warnings = Array.isArray(payload.warnings) ? payload.warnings : []
  }
}

function normalizeFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): FieldError[] => {
    if (typeof entry === 'string') return [{ message: entry }]
    if (!entry || typeof entry !== 'object') return []
    const item = entry as Record<string, unknown>
    const message =
      (typeof item.message === 'string' && item.message) ||
      (typeof item.msg === 'string' && item.msg) ||
      'Invalid value.'
    const field =
      (typeof item.field === 'string' && item.field) ||
      (Array.isArray(item.loc) ? item.loc.map(String).filter((part) => part !== 'body').join('.') : '') ||
      undefined
    const code = typeof item.code === 'string' ? item.code : undefined
    return [{ message, ...(field ? { field } : {}), ...(code ? { code } : {}) }]
  })
}

function isMaterialMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('Retry-After'))
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 10_000)
  return Math.min(250 * 2 ** attempt, 2_000)
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return {}
    }
  }
  const text = await response.text()
  return text ? { message: text.slice(0, 2_000) } : {}
}

export class ApiClient {
  private hooks: AuthHooks = defaultHooks

  configure(hooks: AuthHooks): void {
    this.hooks = hooks
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return (await this.requestWithMeta<T>(path, options)).data
  }

  async requestWithMeta<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API_PATH_MUST_BE_RELATIVE')
    const config = getRuntimeConfig()
    const method = options.method ?? 'GET'
    const safeRead = method === 'GET' || method === 'HEAD'
    const maximumAttempts = safeRead && options.retrySafeReads !== false ? 3 : 1
    let authRefreshAttempted = false

    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const controller = new AbortController()
      const timeout = window.setTimeout(
        () => controller.abort(new DOMException('Request timed out.', 'TimeoutError')),
        options.timeoutMs ?? config.requestTimeoutMs,
      )
      const abortFromCaller = () => controller.abort(options.signal?.reason)
      options.signal?.addEventListener('abort', abortFromCaller, { once: true })

      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      headers.set('X-Correlation-Id', crypto.randomUUID())
      const accessToken = options.includeAuth === false ? null : this.hooks.getAccessToken()
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
      const tenantId = options.includeTenant === false ? null : this.hooks.getTenantId()
      if (tenantId) headers.set('X-Tenant-Id', tenantId)
      if (options.expectedVersion !== undefined) {
        headers.set('If-Match', `"${String(options.expectedVersion).replaceAll('"', '')}"`)
      }
      if (isMaterialMethod(method)) {
        headers.set('Idempotency-Key', options.idempotencyKey ?? crypto.randomUUID())
      }

      let body: BodyInit | undefined
      if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json')
        body = JSON.stringify(options.body)
      }

      try {
        const response = await fetch(`${config.apiBaseUrl}${path}`, {
          method,
          headers,
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
        })

        if (response.status === 401 && !authRefreshAttempted && options.includeAuth !== false) {
          authRefreshAttempted = true
          if (await this.hooks.onUnauthorized()) {
            attempt -= 1
            continue
          }
        }

        if (
          !response.ok &&
          safeRead &&
          attempt + 1 < maximumAttempts &&
          [429, 502, 503, 504].includes(response.status)
        ) {
          await sleep(retryDelay(response, attempt))
          continue
        }

        const payload = await parsePayload(response)
        if (!response.ok) {
          throw new ApiError(
            response.status,
            payload && typeof payload === 'object' ? (payload as ApiErrorPayload) : {},
            response.headers,
          )
        }
        const etag = response.headers.get('ETag') ?? undefined
        const correlationId = response.headers.get('X-Correlation-Id') ?? undefined
        return {
          data: payload as T,
          status: response.status,
          ...(etag ? { etag } : {}),
          ...(correlationId ? { correlationId } : {}),
        }
      } finally {
        window.clearTimeout(timeout)
        options.signal?.removeEventListener('abort', abortFromCaller)
      }
    }
    throw new Error('API_RETRY_STATE_INVALID')
  }
}

export const apiClient = new ApiClient()
