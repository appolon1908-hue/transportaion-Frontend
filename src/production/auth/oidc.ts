import { runtimeConfig } from "../config";
import type { OidcTokens } from "../types";
import {
  constantTimeEqual,
  createCodeChallenge,
  createCodeVerifier,
  decodeJwtPayload,
  randomUrlSafe,
} from "./pkce";

interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

interface AuthorizationTransaction {
  verifier: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
}

interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
}

interface IdentityClaims extends Record<string, unknown> {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  nonce?: string;
  exp?: number;
}

const TRANSACTION_PREFIX = "freight:oidc:transaction:";
const TRANSACTION_MAX_AGE_MS = 10 * 60 * 1000;
let discoveryPromise: Promise<OidcDiscovery> | null = null;

const localReturnPath = (value: string | undefined): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    runtimeConfig.requestTimeoutMs,
  );
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
  } finally {
    window.clearTimeout(timer);
  }
};

export const getDiscovery = async (): Promise<OidcDiscovery> => {
  if (!discoveryPromise) {
    discoveryPromise = (async () => {
      const response = await fetchWithTimeout(
        `${runtimeConfig.oidcIssuer}/.well-known/openid-configuration`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error("Identity discovery is unavailable.");
      }
      const discovery = (await response.json()) as OidcDiscovery;
      if (
        discovery.issuer !== runtimeConfig.oidcIssuer ||
        !discovery.authorization_endpoint?.startsWith("https://") ||
        !discovery.token_endpoint?.startsWith("https://")
      ) {
        throw new Error("Identity discovery did not match the configured issuer.");
      }
      return discovery;
    })().catch((error) => {
      discoveryPromise = null;
      throw error;
    });
  }
  return discoveryPromise;
};

export const beginAuthorization = async (returnTo = "/"): Promise<never> => {
  const discovery = await getDiscovery();
  const state = randomUrlSafe(32);
  const nonce = randomUrlSafe(32);
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const transaction: AuthorizationTransaction = {
    verifier,
    nonce,
    returnTo: localReturnPath(returnTo),
    createdAt: Date.now(),
  };
  sessionStorage.setItem(
    `${TRANSACTION_PREFIX}${state}`,
    JSON.stringify(transaction),
  );

  const authorizationUrl = new URL(discovery.authorization_endpoint);
  authorizationUrl.searchParams.set("client_id", runtimeConfig.oidcClientId);
  authorizationUrl.searchParams.set("redirect_uri", runtimeConfig.oidcRedirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", runtimeConfig.oidcScope);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  window.location.assign(authorizationUrl.toString());
  return new Promise<never>(() => undefined);
};

const validateIdToken = (
  idToken: string,
  expectedNonce: string,
): void => {
  const claims = decodeJwtPayload<IdentityClaims>(idToken);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== runtimeConfig.oidcIssuer) {
    throw new Error("Identity token issuer mismatch.");
  }
  if (!audience.includes(runtimeConfig.oidcClientId)) {
    throw new Error("Identity token audience mismatch.");
  }
  if (
    audience.length > 1 &&
    claims.azp !== undefined &&
    claims.azp !== runtimeConfig.oidcClientId
  ) {
    throw new Error("Identity token authorized-party mismatch.");
  }
  if (!claims.exp || claims.exp <= now - 30) {
    throw new Error("Identity token is expired.");
  }
  if (
    typeof claims.nonce !== "string" ||
    !constantTimeEqual(claims.nonce, expectedNonce)
  ) {
    throw new Error("Identity token nonce mismatch.");
  }
};

const parseTokenResponse = async (
  response: Response,
  previous?: OidcTokens,
  expectedNonce?: string,
): Promise<OidcTokens> => {
  if (!response.ok) {
    throw new Error(`Identity token exchange failed with HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as TokenPayload;
  if (!payload.access_token || !Number.isFinite(payload.expires_in)) {
    throw new Error("Identity token response is incomplete.");
  }
  const idToken = payload.id_token ?? previous?.idToken ?? null;
  if (expectedNonce) {
    if (!idToken) {
      throw new Error("Identity provider did not return an ID token.");
    }
    validateIdToken(idToken, expectedNonce);
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? previous?.refreshToken ?? null,
    idToken,
    tokenType: payload.token_type ?? previous?.tokenType ?? "Bearer",
    expiresAt: Date.now() + payload.expires_in * 1000,
    scope: payload.scope ?? previous?.scope ?? runtimeConfig.oidcScope,
  };
};

export const completeAuthorization = async (
  callbackUrl: string,
): Promise<{ tokens: OidcTokens; returnTo: string }> => {
  const url = new URL(callbackUrl);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    throw new Error(
      url.searchParams.get("error_description") ||
        `Identity provider rejected the request: ${providerError}.`,
    );
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    throw new Error("Identity callback is missing code or state.");
  }

  const storageKey = `${TRANSACTION_PREFIX}${state}`;
  const raw = sessionStorage.getItem(storageKey);
  sessionStorage.removeItem(storageKey);
  if (!raw) {
    throw new Error("Identity transaction is missing or already used.");
  }
  const transaction = JSON.parse(raw) as AuthorizationTransaction;
  if (Date.now() - transaction.createdAt > TRANSACTION_MAX_AGE_MS) {
    throw new Error("Identity transaction expired.");
  }

  const discovery = await getDiscovery();
  const response = await fetchWithTimeout(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: runtimeConfig.oidcClientId,
      redirect_uri: runtimeConfig.oidcRedirectUri,
      code,
      code_verifier: transaction.verifier,
    }),
  });
  const tokens = await parseTokenResponse(
    response,
    undefined,
    transaction.nonce,
  );
  return { tokens, returnTo: localReturnPath(transaction.returnTo) };
};

export const refreshTokens = async (
  current: OidcTokens,
): Promise<OidcTokens> => {
  if (!current.refreshToken) {
    throw new Error("No refresh token is available.");
  }
  const discovery = await getDiscovery();
  const response = await fetchWithTimeout(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: runtimeConfig.oidcClientId,
      refresh_token: current.refreshToken,
    }),
  });
  return parseTokenResponse(response, current);
};

export const buildLogoutUrl = async (
  idToken: string | null,
): Promise<string> => {
  const discovery = await getDiscovery();
  if (!discovery.end_session_endpoint) {
    return runtimeConfig.oidcPostLogoutRedirectUri;
  }
  const url = new URL(discovery.end_session_endpoint);
  url.searchParams.set(
    "post_logout_redirect_uri",
    runtimeConfig.oidcPostLogoutRedirectUri,
  );
  url.searchParams.set("client_id", runtimeConfig.oidcClientId);
  if (idToken) {
    url.searchParams.set("id_token_hint", idToken);
  }
  return url.toString();
};
