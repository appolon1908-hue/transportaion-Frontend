# freight-platform-frontend

Canonical frontend repository for the freight brokerage / 3PL operating platform.

This repository owns the user-facing applications and shared frontend packages. It must never become the source of business authority: all permissions, state transitions, tenant checks, compliance checks, financial rules, and material write validation must be enforced again by the backend.

## Current implementation branch

`fe/freight-platform-foundation`

This branch contains the first executable Vue 3/TypeScript application shell connected to the freight backend `/api/v1` contract.

### Implemented in this branch

- Vue 3 + TypeScript + Vite
- Pinia
- Vue Router
- TanStack Query
- central API client
- correlation-aware error display
- idempotency headers for mutations
- `If-Match` helper support
- credentials-based browser requests (no refresh tokens stored in JavaScript)
- development-only tenant headers
- responsive application shell
- dashboard
- Customers, Carriers, Quotes, Shipments, Loads, Tracking, Invoices, Settlements, Claims, Operations Exceptions and Capabilities routes
- Docker/nginx runtime
- TypeScript build CI
- Vitest foundation

The current generic resource screens are intentionally a foundation. Domain-specific create/edit/tender/dispatch forms, generated OpenAPI types, BFF/OIDC login flow and complete Playwright E2E are subsequent review steps.

## Run locally

```bash
npm install
npm run dev
```

Example development environment:

```text
VITE_API_BASE_URL=http://localhost:8080
VITE_DEV_TENANT_ID=<uuid>
VITE_DEV_ACTOR=frontend-dev
VITE_DEV_PERMISSIONS=*
```

Development tenant headers must never be used as production identity. Production authentication will use the approved OIDC/session architecture.

## Applications

- Broker / dispatcher UI
- Operations UI
- Administration UI
- Customer portal
- Carrier portal

## Preferred stack

- Vue 3
- TypeScript
- Vite
- Composition API / `<script setup>`
- Pinia
- Vue Router
- TanStack Query
- Zod
- OpenAPI-generated API client
- Vitest
- Playwright

See `docs/FRONTEND_ARCHITECTURE.md` for the application and routing authority.
