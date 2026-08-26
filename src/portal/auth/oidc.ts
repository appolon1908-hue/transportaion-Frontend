import { getRuntimeConfig } from '../config'

interface OidcMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
}

interface RawTokenResponse {
  access_token?: unknown
  refresh_token?: unknown
  id_token?: unknown
  token_type?: unknown
  expires_in?: unknown
  refresh_expires_in?: unknown
  scope?: unknown
  error?: unknown
  error_description?: unknown
}

export interface OidcTokens {
  accessToken: string
  refreshToken?: string
  idToken?: string
  tokenType: 'Bearer'
  scope: string
  expiresAt: number
  refreshExpiresAt?: number
}

interface AuthorizationTransaction {
  state: string
  nonce: string
  verifier: string
  returnTo: string
  createdAt: number
}

const TRANSACTION_KEY = 'freight.oidc.transaction.v1'
const TRANSACTION_MAX_AGE_MS = 10 * 60 * 1000
let metadataPromise: Promise<OidcMetadata> | null = null

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function randomValue(bytes = 32): string {
  const value = new Uint8Array(bytes)
  crypto.getRandomValues(value)
  return base64Url(value)
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64Url(new Uint8Array(digest))
}

function safeEndpoint(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new Error(`${name}_MISSING`)
  const endpoint = new URL(value)
  const localhost = endpoint.hostname === 'localhost' || endpoint.hostname === '127.0.0.1'
  if (endpoint.protocol !== 'https:' && !(localhost && endpoint.protocol === 'http:')) {
    throw new Error(`${name}_HTTPS_REQUIRED`)
  }
  if (endpoint.username || endpoint.password) throw new Error(`${name}_USERINFO_FORBIDDEN`)
  return endpoint.toString()
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), getRuntimeConfig().requestTimeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function metadata(): Promise<OidcMetadata> {
  if (!metadataPromise) {
    metadataPromise = (async () => {
      const config = getRuntimeConfig()
      const discoveryUrl = `${config.oidcIssuer}/.well-known/openid-configuration`
      const response = await fetchWithTimeout(discoveryUrl, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`OIDC_DISCOVERY_FAILED_${response.status}`)
      const raw = (await response.json()) as Record<string, unknown>
      const issuer = safeEndpoint(raw.issuer, 'OIDC_ISSUER').replace(/\/$/u, '')
      if (issuer !== config.oidcIssuer) throw new Error('OIDC_DISCOVERY_ISSUER_MISMATCH')
      const result: OidcMetadata = {
        issuer,
        authorization_endpoint: safeEndpoint(raw.authorization_endpoint, 'OIDC_AUTHORIZATION_ENDPOINT'),
        token_endpoint: safeEndpoint(raw.token_endpoint, 'OIDC_TOKEN_ENDPOINT'),
      }
      if (typeof raw.end_session_endpoint === 'string') {
        result.end_session_endpoint = safeEndpoint(raw.end_session_endpoint, 'OIDC_END_SESSION_ENDPOINT')
      }
      return result
    })().catch((error: unknown) => {
      metadataPromise = null
      throw error
    })
  }
  return metadataPromise
}

function safeReturnTo(value: string): string {
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

function writeTransaction(transaction: AuthorizationTransaction): void {
  sessionStorage.setItem(TRANSACTION_KEY, JSON.stringify(transaction))
}

function readTransaction(): AuthorizationTransaction {
  const value = sessionStorage.getItem(TRANSACTION_KEY)
  sessionStorage.removeItem(TRANSACTION_KEY)
  if (!value) throw new Error('OIDC_TRANSACTION_MISSING')
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('OIDC_TRANSACTION_INVALID')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('OIDC_TRANSACTION_INVALID')
  const item = parsed as Record<string, unknown>
  if (
    typeof item.state !== 'string' ||
    typeof item.nonce !== 'string' ||
    typeof item.verifier !== 'string' ||
    typeof item.returnTo !== 'string' ||
    typeof item.createdAt !== 'number'
  ) {
    throw new Error('OIDC_TRANSACTION_INVALID')
  }
  if (Date.now() - item.createdAt > TRANSACTION_MAX_AGE_MS) throw new Error('OIDC_TRANSACTION_EXPIRED')
  return {
    state: item.state,
    nonce: item.nonce,
    verifier: item.verifier,
    returnTo: safeReturnTo(item.returnTo),
    createdAt: item.createdAt,
  }
}

function jwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return {}
  try {
    const normalized = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function normalizedTokens(raw: RawTokenResponse, expectedNonce?: string): OidcTokens {
  if (typeof raw.error === 'string') {
    throw new Error(`OIDC_TOKEN_${raw.error.toUpperCase()}`)
  }
  if (
    typeof raw.access_token !== 'string' ||
    raw.access_token.length < 20 ||
    (typeof raw.token_type === 'string' && raw.token_type.toLowerCase() !== 'bearer')
  ) {
    throw new Error('OIDC_TOKEN_RESPONSE_INVALID')
  }
  const expiresIn = Number(raw.expires_in)
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('OIDC_TOKEN_EXPIRY_INVALID')
  const now = Date.now()
  const idToken = typeof raw.id_token === 'string' ? raw.id_token : undefined
  if (expectedNonce) {
    if (!idToken) throw new Error('OIDC_ID_TOKEN_REQUIRED')
    const nonce = jwtPayload(idToken).nonce
    if (nonce !== expectedNonce) throw new Error('OIDC_NONCE_MISMATCH')
  }
  const refreshExpiresIn = Number(raw.refresh_expires_in)
  return {
    accessToken: raw.access_token,
    ...(typeof raw.refresh_token === 'string' ? { refreshToken: raw.refresh_token } : {}),
    ...(idToken ? { idToken } : {}),
    tokenType: 'Bearer',
    scope: typeof raw.scope === 'string' ? raw.scope : getRuntimeConfig().oidcScope,
    expiresAt: now + expiresIn * 1000,
    ...(Number.isFinite(refreshExpiresIn) && refreshExpiresIn > 0
      ? { refreshExpiresAt: now + refreshExpiresIn * 1000 }
      : {}),
  }
}

async function tokenRequest(parameters: URLSearchParams, expectedNonce?: string): Promise<OidcTokens> {
  const endpoints = await metadata()
  const response = await fetchWithTimeout(endpoints.token_endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: parameters,
  })
  const raw = (await response.json().catch(() => ({}))) as RawTokenResponse
  if (!response.ok) {
    const code = typeof raw.error === 'string' ? raw.error : `HTTP_${response.status}`
    throw new Error(`OIDC_TOKEN_${code.toUpperCase()}`)
  }
  return normalizedTokens(raw, expectedNonce)
}

export async function beginAuthorization(returnTo: string): Promise<never> {
  const config = getRuntimeConfig()
  const endpoints = await metadata()
  const state = randomValue()
  const nonce = randomValue()
  const verifier = randomValue(64)
  writeTransaction({ state, nonce, verifier, returnTo: safeReturnTo(returnTo), createdAt: Date.now() })

  const url = new URL(endpoints.authorization_endpoint)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.oidcClientId,
    redirect_uri: config.oidcRedirectUri,
    scope: config.oidcScope,
    state,
    nonce,
    code_challenge: await sha256(verifier),
    code_challenge_method: 'S256',
  }).toString()
  window.location.assign(url)
  return await new Promise<never>(() => undefined)
}

export async function completeAuthorization(
  callbackUrl = window.location.href,
): Promise<{ tokens: OidcTokens; returnTo: string }> {
  const config = getRuntimeConfig()
  const callback = new URL(callbackUrl)
  const error = callback.searchParams.get('error')
  if (error) throw new Error(`OIDC_CALLBACK_${error.toUpperCase()}`)
  const code = callback.searchParams.get('code')
  const state = callback.searchParams.get('state')
  if (!code || !state) throw new Error('OIDC_CALLBACK_CODE_OR_STATE_MISSING')
  const transaction = readTransaction()
  if (transaction.state !== state) throw new Error('OIDC_STATE_MISMATCH')

  const tokens = await tokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.oidcClientId,
      code,
      redirect_uri: config.oidcRedirectUri,
      code_verifier: transaction.verifier,
    }),
    transaction.nonce,
  )
  window.history.replaceState({}, document.title, callback.pathname)
  return { tokens, returnTo: transaction.returnTo }
}

export async function refreshAuthorization(refreshToken: string): Promise<OidcTokens> {
  const config = getRuntimeConfig()
  return tokenRequest(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.oidcClientId,
      refresh_token: refreshToken,
    }),
  )
}

export async function endSessionUrl(idToken?: string): Promise<string> {
  const config = getRuntimeConfig()
  const endpoints = await metadata()
  if (!endpoints.end_session_endpoint) return config.oidcPostLogoutRedirectUri
  const url = new URL(endpoints.end_session_endpoint)
  url.searchParams.set('client_id', config.oidcClientId)
  url.searchParams.set('post_logout_redirect_uri', config.oidcPostLogoutRedirectUri)
  if (idToken) url.searchParams.set('id_token_hint', idToken)
  return url.toString()
}

export function clearAuthorizationTransaction(): void {
  sessionStorage.removeItem(TRANSACTION_KEY)
}
