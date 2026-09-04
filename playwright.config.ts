import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npx --no-install vite --config vite.e2e.config.ts",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_API_BASE_URL: `${baseURL}/api/v1`,
      VITE_OIDC_ISSUER: "https://auth.codestra.co/realms/codestra",
      VITE_OIDC_CLIENT_ID: "freight-platform-web",
      VITE_OIDC_SCOPE: "openid profile email offline_access",
      VITE_OIDC_REDIRECT_URI: `${baseURL}/auth/callback`,
      VITE_OIDC_POST_LOGOUT_REDIRECT_URI: `${baseURL}/login`,
      VITE_AUTH_CONTEXT_PATH: "/auth/me",
      VITE_ORGANIZATION_SELECTION_HEADER: "X-Organization-ID",
      VITE_REQUEST_TIMEOUT_MS: "5000",
    },
  },
});
