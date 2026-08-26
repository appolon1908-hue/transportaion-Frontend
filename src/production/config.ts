const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const browserOrigin =
  typeof window === "undefined" ? "https://freight.codestra.co" : window.location.origin;

const read = (value: string | undefined, fallback: string): string =>
  value?.trim() || fallback;

export const runtimeConfig = Object.freeze({
  apiBaseUrl: stripTrailingSlash(
    read(import.meta.env.VITE_API_BASE_URL, "/api/v1"),
  ),
  oidcIssuer: stripTrailingSlash(
    read(
      import.meta.env.VITE_OIDC_ISSUER,
      "https://auth.codestra.co/realms/codestra",
    ),
  ),
  oidcClientId: read(
    import.meta.env.VITE_OIDC_CLIENT_ID,
    "freight-platform-web",
  ),
  oidcScope: read(
    import.meta.env.VITE_OIDC_SCOPE,
    "openid profile email offline_access",
  ),
  oidcRedirectUri: read(
    import.meta.env.VITE_OIDC_REDIRECT_URI,
    `${browserOrigin}/auth/callback`,
  ),
  oidcPostLogoutRedirectUri: read(
    import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    `${browserOrigin}/login`,
  ),
  authContextPath: read(
    import.meta.env.VITE_AUTH_CONTEXT_PATH,
    "/auth/me",
  ),
  organizationSelectionHeader: read(
    import.meta.env.VITE_ORGANIZATION_SELECTION_HEADER,
    "X-Organization-ID",
  ),
  requestTimeoutMs: Number.parseInt(
    read(import.meta.env.VITE_REQUEST_TIMEOUT_MS, "20000"),
    10,
  ),
  applicationName: read(
    import.meta.env.VITE_APPLICATION_NAME,
    "Freight Control Tower",
  ),
});

if (
  import.meta.env.PROD &&
  (!runtimeConfig.apiBaseUrl ||
    !runtimeConfig.oidcIssuer.startsWith("https://") ||
    !runtimeConfig.oidcClientId)
) {
  throw new Error("Production API and OIDC configuration is incomplete.");
}
