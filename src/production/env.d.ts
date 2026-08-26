/// <reference types="vite/client" />

declare const __BUILD_SHA__: string;

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_OIDC_ISSUER?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_OIDC_SCOPE?: string;
  readonly VITE_OIDC_REDIRECT_URI?: string;
  readonly VITE_OIDC_POST_LOGOUT_REDIRECT_URI?: string;
  readonly VITE_AUTH_CONTEXT_PATH?: string;
  readonly VITE_ORGANIZATION_SELECTION_HEADER?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_APPLICATION_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
