# Freight platform portal architecture

Status: implementation branch. This branch does not deploy, enable a live capability, rename the GitHub repository, or promote a production branch.

Canonical repository identity: `appolon1908-hue/freight-platform-frontend`.
Current legacy GitHub repository: `appolon1908-hue/transportaion-Frontend`.

The physical repository rename is an owner action and is tracked separately. CI, release provenance and image names must use the canonical identity after the rename; documentation alone is not sufficient.

## Build separation

The existing frontend foundation remains intact. The authenticated portal has its own entry document, TypeScript project and Vite build:

```text
portal.html
src/portal/**
tsconfig.portal.json
vite.portal.config.ts
dist-portal/
```

This prevents marketing-site concerns and authenticated application concerns from becoming one bundle or one release surface.

## Identity flow

The portal is an OIDC public client using Authorization Code with PKCE S256:

1. fetch issuer discovery metadata;
2. require exact discovery-issuer match;
3. create cryptographically random state, nonce and PKCE verifier;
4. retain the short-lived authorization transaction only in `sessionStorage`;
5. redirect to the identity provider without a client secret;
6. validate callback state and ID-token nonce;
7. exchange the code with the PKCE verifier;
8. keep access, refresh and ID tokens only in JavaScript memory;
9. call `GET /api/v1/auth/me` for principal and memberships;
10. select an active tenant;
11. call `GET /api/v1/auth/context` with `X-Tenant-Id`;
12. use the returned roles, permissions and capabilities for portal presentation.

Token claims are not treated as authoritative application authorization. The backend revalidates issuer, audience, subject, membership, tenant, RBAC and capabilities on every request.

The portal stores only the selected tenant ID in `sessionStorage`. It does not store bearer tokens in `localStorage`, `sessionStorage`, IndexedDB, cookies or URLs.

## Session restart behavior

A full page refresh intentionally clears the in-memory tokens. The user returns through the identity provider, which may complete quickly when its own SSO session is still active. This favors token containment over silent browser persistence.

A future browser-session restoration mechanism must be implemented through a reviewed backend-for-frontend or hardened identity-session design. It must not be added by placing refresh tokens in browser storage.

## Tenant selection

`GET /api/v1/auth/me` is called without `X-Tenant-Id`. It returns the memberships visible to the authenticated subject.

After selection, the portal sets `X-Tenant-Id` and calls `GET /api/v1/auth/context`. The context response must match the selected tenant. A mismatch fails closed.

Changing organizations:

- changes the active tenant header;
- reloads backend-authoritative context;
- returns the user to the overview;
- does not reuse old-tenant permissions or capabilities;
- does not grant authority by editing browser state.

## API client contract

All API paths are relative to the validated runtime `apiBaseUrl`. Protocol-relative and absolute request paths are rejected.

The shared client provides:

- bearer authorization from memory;
- active `X-Tenant-Id` context;
- generated `X-Correlation-Id`;
- generated `Idempotency-Key` for POST, PUT, PATCH and DELETE;
- optional `If-Match` for versioned writes;
- `Accept: application/json` and JSON request bodies;
- no cookie credentials;
- no redirects;
- bounded timeout and cancellation;
- safe-read retry only for 429, 502, 503 and 504;
- no automatic mutation retry;
- normalized field errors, retry timing, stale version, blockers, warnings and correlation IDs.

A user-visible retry of a material command must reuse the original idempotency key when the first outcome is unknown. Feature views added on later branches own that command-state behavior.

## Route authorization

A route may declare:

```text
permission
anyPermission[]
capability
```

The router prevents a view from mounting when the current backend context lacks the declared requirement. Navigation uses the same metadata to hide inaccessible workspaces.

This is presentation safety only. Direct URL entry, developer tools or modified JavaScript cannot authorize an action because the backend remains authoritative.

## Runtime configuration

`public/runtime-config.js` contains deliberate fail-closed placeholders. The production image replaces it at startup through `deploy/frontend/entrypoint.sh`.

Required public values:

```text
APP_ENVIRONMENT=production
PUBLIC_API_BASE_URL=https://api.example.com
PORTAL_PUBLIC_ORIGIN=https://portal.example.com
OIDC_ISSUER=https://auth.codestra.co/realms/<realm>
OIDC_CLIENT_ID=freight-portal
OIDC_SCOPE=openid profile email
REQUEST_TIMEOUT_MS=20000
```

The entrypoint rejects:

- missing values;
- non-HTTPS endpoints;
- a portal origin containing a path;
- URL user-info, whitespace, quotes, query or fragment;
- unsafe environment/client identifiers;
- scope without `openid`;
- timeout outside 5–60 seconds.

No secret, password, private key, client secret or provider credential belongs in browser runtime configuration.

## Static image

`deploy/frontend/Dockerfile.portal` is a multi-stage build. Production must supply digest-pinned `NODE_IMAGE` and `NGINX_IMAGE` build arguments. The build:

1. installs locked dependencies with lifecycle scripts disabled;
2. type-checks the isolated portal;
3. creates the production Vite bundle;
4. verifies required outputs;
5. scans output for obvious credential material.

The runtime:

- runs as the `nginx` user;
- listens on private port 8080;
- serves no API or secret;
- supports a read-only root filesystem;
- writes public runtime configuration only to `/tmp` through a fixed symlink;
- sends no-store headers for HTML and runtime configuration;
- sends immutable caching for static assets;
- installs CSP, frame denial, no-sniff, strict referrer and restricted permissions headers;
- exposes only sanitized `/health/live`.

Caddy and Kong remain the public edge. The frontend container port must not be published directly to the Internet.

## Shared design system

`src/portal/styles.css` establishes a single application language for later feature branches:

- responsive navigation shell;
- large, clean page hierarchy;
- panels, metrics, tables and toolbars;
- forms, validation and action groups;
- status badges, alerts, tabs and pagination;
- accessible focus styles and skip link;
- mobile navigation and reduced-motion support.

Operations, administration, customer and carrier portals must reuse this system rather than introducing unrelated shells.

## Branch stack

```text
fe/freight-platform-foundation
        ↓
fe/auth-portal-shell-v2
        ↓
fe/operations-admin-workflows-v3
        ↓
fe/customer-carrier-portals-v4
```

Every branch must receive independent review and green checks at an unchanged head SHA. Do not merge the top branch directly to `main`, squash away the reviewed lineage, or create a production branch from an unreviewed stack.

## Acceptance gates for this branch

```text
[ ] repository physically renamed to freight-platform-frontend
[ ] OIDC public client configured with Authorization Code + PKCE S256
[ ] exact redirect and post-logout URLs registered
[ ] no browser client secret configured
[ ] /auth/me and /auth/context contracts verified against deployed backend
[ ] type check and production build green
[ ] portal contract test green
[ ] Nginx syntax and container smoke test green
[ ] runtime accepts safe config and rejects unsafe config
[ ] bundle scan clean
[ ] independent review at unchanged SHA
[ ] immutable frontend image release workflow added after physical rename
```
