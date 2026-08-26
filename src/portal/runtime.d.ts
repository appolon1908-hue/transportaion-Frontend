import 'vue-router'

export {}

declare global {
  interface Window {
    __FREIGHT_CONFIG__?: {
      environment?: string
      appName?: string
      apiBaseUrl?: string
      oidcIssuer?: string
      oidcClientId?: string
      oidcRedirectUri?: string
      oidcPostLogoutRedirectUri?: string
      oidcScope?: string
      requestTimeoutMs?: number
      [key: string]: unknown
    }
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    shell?: boolean
    title?: string
    permission?: string
    capability?: string
    anyPermission?: string[]
  }
}
