# Production portal identity and API architecture

This document applies to `fe/portal-shell-authz-api-v2`, stacked on
`fe/freight-platform-foundation`. It introduces an isolated production entrypoint
without replacing or merging the foundation application.

## Authentication

The browser uses OIDC Authorization Code with PKCE S256 against the canonical
issuer `https://auth.codestra.co/realms/codestra`.

- The SPA is a public client and has no client secret.
- State, nonce and a high-entropy verifier are generated with Web Crypto.
- The authorization transaction is single-use and expires after ten minutes.
- The callback checks state, nonce, issuer, audience, authorized party and expiry.
- Access, refresh and ID tokens remain in Pinia memory only. They are never written
  to local storage, session storage, IndexedDB, cookies or URLs.
- Session storage contains only the short-lived PKCE transaction and the selected
  organization ID.
- A reload starts a new login unless a future reviewed BFF/session-cookie layer is
  introduced. This is deliberate; the current SPA does not weaken token storage to
  make reload persistence convenient.
- Refresh requests are single-flight so simultaneous API requests do not rotate the
  same refresh token more than once.

The backend still verifies token signature, issuer, audience, authorized party,
expiry and local `issuer + subject` identity. Browser claim parsing is a UX check,
not an authorization boundary.

## Organization selection

After token exchange, the portal loads `/api/v1/auth/me` by default. The path is
runtime-configurable to match the reviewed backend route.

The response is normalized into:

- local user;
- active organization memberships;
- selected organization;
- roles;
- permissions;
- capabilities; and
- available portal kinds.

The organization header is a selection hint only. The browser accepts only an ID
present in the returned membership list, and the backend must validate active
membership and tenant context on every request. Kong may remove actor, permission
and tenant-authority headers, but it must preserve the one reviewed organization
selection mechanism expected by the backend.

## Portal gates

- **Administration** requires the admin portal and `admin.users.manage`.
- **Operations** requires the operations portal and `operations.read`.
- **Customer portal** requires the customer portal plus
  `customer_portal.external_access`.
- **Carrier portal** requires the carrier portal plus
  `carrier_portal.external_access`.

These checks control navigation and presentation only. They do not authorize API
operations. FastAPI permissions, capability gates, tenant RLS, database constraints
and compliance triggers remain authoritative.

## API client

The production API client:

- obtains a fresh in-memory bearer token before each request;
- adds a unique `X-Correlation-Id`;
- adds the validated organization selection when present;
- automatically creates `Idempotency-Key` for material mutations;
- reuses the same idempotency key and correlation ID across one 401 refresh retry;
- supports `If-Match` for optimistic concurrency;
- enforces a request timeout and caller cancellation;
- parses 409/412 conflicts, current versions and compliance reason codes;
- parses rate-limit and retry headers;
- never sends browser credentials/cookies; and
- never treats a hidden or disabled control as backend authorization.

Callers may pass an explicit idempotency key when a workflow needs to preserve it
across user confirmation, page state or an offline retry. A changed payload must
use a new key.

## Build and content security

The production portal builds from `index.production.html` and
`vite.production.config.ts` into `dist-production`.

- JavaScript and CSS filenames are content hashed.
- Source maps are disabled.
- The initial document includes a restrictive CSP for the canonical API and issuer.
- The edge server must send the final CSP, HSTS, frame, content-type, referrer and
  permissions-policy headers; the HTML meta policy is defense in depth.
- CI enforces strict type checking, no token storage, no client secret, PKCE S256,
  idempotency/concurrency headers, portal capability gates, no source maps, asset
  hashing and a compressed JavaScript budget.

## Runtime variables

```text
VITE_API_BASE_URL
VITE_OIDC_ISSUER
VITE_OIDC_CLIENT_ID
VITE_OIDC_SCOPE
VITE_OIDC_REDIRECT_URI
VITE_OIDC_POST_LOGOUT_REDIRECT_URI
VITE_AUTH_CONTEXT_PATH
VITE_ORGANIZATION_SELECTION_HEADER
VITE_REQUEST_TIMEOUT_MS
VITE_APPLICATION_NAME
```

Production requires HTTPS for the OIDC issuer. The Keycloak client must allow only
approved redirect and post-logout URIs, use Authorization Code + PKCE S256, and
have no browser client secret.

## Deliberately deferred to the next stacked branch

- domain-specific resource screens and mutations;
- detailed admin integration/compliance controls;
- shipment/load/tender/dispatch workflows;
- customer and carrier self-service workflows;
- service worker/offline queue;
- production container and edge configuration;
- image SBOM/signature/release workflow.

This keeps identity, token handling, API semantics and portal authorization small
enough for independent review before operational workflows are layered on top.
