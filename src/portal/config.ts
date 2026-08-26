export interface RuntimeConfig {
  environment: string
  appName: string
  apiBaseUrl: string
  oidcIssuer: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcScope: string
  requestTimeoutMs: number
}

export class RuntimeConfigurationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'RuntimeConfigurationError'
    this.code = code
  }
}

let cached: RuntimeConfig | null = null

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('__RUNTIME_REQUIRED__')) {
    throw new RuntimeConfigurationError(
      `${name.toUpperCase()}_REQUIRED`,
      `${name} must be supplied by runtime configuration.`,
    )
  }
  return value.trim()
}

function normalizedUrl(
  value: unknown,
  name: string,
  options: { sameOrigin?: boolean; allowPath?: boolean } = {},
): string {
  const raw = requiredString(value, name)
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new RuntimeConfigurationError(`${name.toUpperCase()}_INVALID`, `${name} must be an absolute URL.`)
  }

  const developmentLocalhost =
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && parsed.protocol === 'http:'
  if (parsed.protocol !== 'https:' && !developmentLocalhost) {
    throw new RuntimeConfigurationError(`${name.toUpperCase()}_HTTPS_REQUIRED`, `${name} must use HTTPS.`)
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new RuntimeConfigurationError(
      `${name.toUpperCase()}_UNSAFE`,
      `${name} cannot include credentials, a query, or a fragment.`,
    )
  }
  if (options.allowPath === false && parsed.pathname !== '/') {
    throw new RuntimeConfigurationError(`${name.toUpperCase()}_ORIGIN_REQUIRED`, `${name} must be an origin.`)
  }
  if (options.sameOrigin && parsed.origin !== window.location.origin) {
    throw new RuntimeConfigurationError(
      `${name.toUpperCase()}_SAME_ORIGIN_REQUIRED`,
      `${name} must use the portal origin.`,
    )
  }
  return parsed.toString().replace(/\/$/, '')
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cached) return cached

  const source = window.__FREIGHT_CONFIG__
  if (!source || typeof source !== 'object') {
    throw new RuntimeConfigurationError(
      'RUNTIME_CONFIG_MISSING',
      'The runtime configuration file is missing.',
    )
  }
  for (const key of Object.keys(source)) {
    if (/secret|password|private.?key/i.test(key)) {
      throw new RuntimeConfigurationError(
        'BROWSER_SECRET_FORBIDDEN',
        'Browser runtime configuration cannot contain secret material.',
      )
    }
  }

  const environment = requiredString(source.environment, 'environment').toLowerCase()
  const appName = requiredString(source.appName, 'appName')
  const apiBaseUrl = normalizedUrl(source.apiBaseUrl, 'apiBaseUrl', { allowPath: true })
  const oidcIssuer = normalizedUrl(source.oidcIssuer, 'oidcIssuer', { allowPath: true })
  const oidcClientId = requiredString(source.oidcClientId, 'oidcClientId')
  const oidcRedirectUri = normalizedUrl(source.oidcRedirectUri, 'oidcRedirectUri', {
    sameOrigin: true,
    allowPath: true,
  })
  const oidcPostLogoutRedirectUri = normalizedUrl(
    source.oidcPostLogoutRedirectUri,
    'oidcPostLogoutRedirectUri',
    { sameOrigin: true, allowPath: true },
  )
  const scope = requiredString(source.oidcScope, 'oidcScope')
    .split(/\s+/)
    .filter(Boolean)
  if (!scope.includes('openid')) {
    throw new RuntimeConfigurationError('OIDC_OPENID_SCOPE_REQUIRED', 'OIDC scope must include openid.')
  }
  const oidcScope = [...new Set(scope)].join(' ')

  const timeoutValue = Number(source.requestTimeoutMs ?? 20_000)
  if (!Number.isInteger(timeoutValue) || timeoutValue < 5_000 || timeoutValue > 60_000) {
    throw new RuntimeConfigurationError(
      'REQUEST_TIMEOUT_INVALID',
      'requestTimeoutMs must be an integer between 5000 and 60000.',
    )
  }

  cached = Object.freeze({
    environment,
    appName,
    apiBaseUrl,
    oidcIssuer,
    oidcClientId,
    oidcRedirectUri,
    oidcPostLogoutRedirectUri,
    oidcScope,
    requestTimeoutMs: timeoutValue,
  })
  return cached
}

export function resetRuntimeConfigForTests(): void {
  cached = null
}
