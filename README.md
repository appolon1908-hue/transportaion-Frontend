# freight-platform-frontend

Canonical frontend repository for the freight brokerage / 3PL operating platform.

This repository owns the user-facing applications and shared frontend packages. It must never become the source of business authority: all permissions, state transitions, tenant checks, compliance checks, financial rules, and material write validation must be enforced again by the backend.

## Applications

- Broker / dispatcher UI
- Operations UI
- Administration UI
- Customer portal
- Carrier portal

## Shared packages

- UI design system
- Generated API client
- Authentication helpers
- Permission/capability helpers
- Shared TypeScript types
- Validation schemas
- Maps/geospatial components
- Notifications
- Runtime configuration

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
