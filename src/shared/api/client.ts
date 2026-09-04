export type ApiProblem = {
  code: string
  message: string
  correlation_id?: string | null
  fields?: unknown
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ApiProblem,
  ) {
    super(problem.message)
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
const devTenant = import.meta.env.VITE_DEV_TENANT_ID
const devActor = import.meta.env.VITE_DEV_ACTOR ?? 'frontend-dev'
const devPermissions = import.meta.env.VITE_DEV_PERMISSIONS ?? '*'

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (devTenant) {
    headers.set('X-Dev-Tenant-Id', devTenant)
    headers.set('X-Dev-Actor', devActor)
    headers.set('X-Dev-Permissions', devPermissions)
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      code: 'HTTP_ERROR',
      message: response.statusText || 'Request failed',
    })) as ApiProblem
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return await response.json() as T
}

export function mutationHeaders(etag?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Idempotency-Key': crypto.randomUUID(),
  }
  if (etag) headers['If-Match'] = etag
  return headers
}
