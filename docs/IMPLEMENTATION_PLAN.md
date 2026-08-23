# Freight Platform Frontend Implementation Plan

Canonical project name: `freight-platform-frontend`

## Current repository status

This repository currently contains documentation only. No executable Vue application, package manifest, generated API client, authentication integration, tests, Docker runtime, or CI pipeline is present yet.

```text
ARCHITECTURE_DEFINED=YES
VUE_RUNTIME_IMPLEMENTED=NO
AUTH_UI_IMPLEMENTED=NO
GENERATED_API_CLIENT_IMPLEMENTED=NO
BROKER_UI_IMPLEMENTED=NO
OPS_UI_IMPLEMENTED=NO
ADMIN_UI_IMPLEMENTED=NO
CUSTOMER_PORTAL_IMPLEMENTED=NO
CARRIER_PORTAL_IMPLEMENTED=NO
E2E_IMPLEMENTED=NO
PRODUCTION_READY=NO
```

The binding frontend stack is **Vue 3 + TypeScript + Vite**. Business authority remains server-side.

## Binding frontend stack

- Vue 3
- TypeScript
- Vite
- Composition API
- `<script setup>`
- Vue Router
- Pinia
- TanStack Query
- Zod
- OpenAPI-generated TypeScript client
- Vitest
- Vue Test Utils
- Playwright
- Docker
- GitHub Actions

## Missing code — P0 foundation

### Workspace/runtime

- `package.json`
- committed lock file
- `vite.config.ts`
- `tsconfig.json`
- `src/main.ts`
- `src/App.vue`
- application shell/layout
- Vue Router
- Pinia bootstrap
- TanStack Query bootstrap
- runtime environment validation
- centralized error handling
- Dockerfile
- nginx/proxy configuration
- CI lint/typecheck/test/build workflow
- Vitest
- Playwright

### Authentication / permission UX

- OIDC login integration
- auth callback
- logout
- session-expiry handling
- secure browser-session architecture decision/ADR
- authenticated application bootstrap
- `/api/v1/me`
- `/api/v1/me/permissions`
- `/api/v1/capabilities`
- route guards
- permission-aware navigation
- capability-aware navigation
- forbidden/unauthorized views
- unknown capability = disabled

Frontend permission/capability checks are UX controls only. Backend enforcement remains mandatory.

### Generated API client

- backend OpenAPI export
- generated TypeScript types/client
- CI stale-contract check
- typed standard error envelope
- correlation ID support
- idempotency-key support for material mutations
- ETag capture
- `If-Match` support
- 401/403/404/409/412/422/429/500/503 handling
- safe retry behavior
- no scattered raw `fetch()` calls

## Missing code — P1 applications

### Broker / dispatcher

- dashboard
- customers
- customer contacts/locations
- quotes and quote versions
- shipments
- shipment detail
- legs/stops/commodities
- loads
- load detail
- carrier search
- tendering
- dispatch board
- tracking/map
- documents/POD
- invoices
- settlements
- exceptions
- reports

### Operations

- operational dashboard
- exception queue
- shipment/load monitoring
- load board
- dispatch board
- tracking visibility
- manual overrides through authorized commands
- tasks/escalations
- dead letters
- replay/recovery tools
- integration health

### Administration

- tenants
- organizations
- users
- roles
- permissions
- capabilities
- configuration
- audit UI
- integration configuration/health
- system/readiness view

### Customer portal foundation

- customer authentication/session
- quote views/actions
- shipment views
- tracking
- documents
- invoices
- account/preferences
- strict customer ownership boundaries

### Carrier portal foundation

- carrier authentication/session
- load/tender offers
- accept/reject workflow
- assigned loads
- dispatch/tracking workflow
- document upload
- POD
- compliance/insurance surfaces
- strict carrier ownership boundaries

## Required UX behavior

Every important form/workflow must handle:

- loading
- empty state
- success
- client validation
- server validation
- 401 authentication
- 403 authorization
- 404 unavailable/not found
- 409 business conflict
- 412 stale version
- 422 validation
- 429 rate limit
- 500 unexpected failure
- 503 dependency unavailable
- network timeout
- safe retry
- double-submit protection
- refresh recovery
- back navigation
- responsive layout
- keyboard navigation
- screen-reader support

## Sequence

1. Vue workspace/runtime + CI + lint + typecheck + Vitest + Playwright
2. Shared design system + application shell
3. OIDC authentication/session integration
4. Permission/capability-aware routing/navigation
5. Generated OpenAPI client + centralized error handling + idempotency/ETag support
6. Customers/carriers/quotes workflows
7. Shipments/loads/tender/dispatch workflows
8. Tracking/documents/billing workflows
9. Operations application
10. Administration application
11. Customer portal foundation
12. Carrier portal foundation
13. Notifications/activity/reports/search
14. Accessibility/responsive/security hardening
15. Complete Playwright business flow + performance/release validation

## Complete E2E business flow

```text
login
  ↓
create customer
  ↓
create carrier
  ↓
create quote
  ↓
accept quote
  ↓
create shipment
  ↓
create shipment leg
  ↓
create load
  ↓
send tender
  ↓
accept tender
  ↓
dispatch
  ↓
tracking
  ↓
deliver
  ↓
POD
  ↓
invoice
```

Negative E2E must also cover denied permissions, cross-tenant attempts, disabled capabilities, concurrency conflicts, stale versions, unavailable integrations and expired sessions.

## Required frontend tree

```text
freight-platform-frontend/
├── src/
│   ├── app/
│   │   ├── router.ts
│   │   ├── query-client.ts
│   │   └── bootstrap.ts
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── carriers/
│   │   ├── quotes/
│   │   ├── shipments/
│   │   ├── loads/
│   │   ├── dispatch/
│   │   ├── tracking/
│   │   ├── documents/
│   │   ├── finance/
│   │   ├── operations/
│   │   ├── admin/
│   │   ├── customer-portal/
│   │   └── carrier-portal/
│   ├── shared/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── capabilities/
│   │   ├── components/
│   │   ├── validation/
│   │   └── utilities/
│   ├── stores/
│   ├── App.vue
│   └── main.ts
├── e2e/
├── public/
├── .github/workflows/
├── Dockerfile
├── nginx.conf
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Release gates

A successful build does not activate external access. Customer/carrier portal access and privileged operations remain capability-gated until backend authorization, security, integration, staging, restore, canary and rollback gates pass.

## Current verdict

```text
DESIGN=STRONG
IMPLEMENTATION=DOCUMENTATION_ONLY
NEXT_SAFE_ACTION=PR_01_VUE_RUNTIME_FOUNDATION
PRODUCTION_READY=NO
```
