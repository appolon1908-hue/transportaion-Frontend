# Freight Platform Frontend Implementation Plan

Canonical project name: `freight-platform-frontend`

Frontend work begins against stable backend contracts and generated OpenAPI types. Business authority remains exclusively server-side.

## Sequence

1. Workspace/runtime foundation, CI, lint, typecheck, Vitest, Playwright
2. Shared design system and application shell
3. OIDC authentication integration
4. Permission/capability-aware routing and navigation
5. Generated OpenAPI API client and centralized error handling
6. Broker/dispatcher workflows
7. Operations dashboard, dispatch board, load board, tracking, exceptions
8. Administration application
9. Customer portal
10. Carrier portal
11. Documents/upload/download UX
12. Notifications and activity surfaces
13. Reports/search surfaces
14. Accessibility, responsive layouts, security hardening
15. End-to-end, performance and release validation

## Release gates

A frontend application is not production-active merely because it builds successfully. External customer/carrier access and privileged operational actions remain capability-gated until backend authorization, integration, security, and production release gates are satisfied.
