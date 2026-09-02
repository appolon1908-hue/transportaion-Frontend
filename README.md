# freight-platform-frontend

Canonical frontend authority for the freight brokerage and 3PL operating platform.

## Repository identity

```text
STABLE_GITHUB_REPOSITORY_ID=1343761049
CURRENT_OPERATIONAL_REPOSITORY=appolon1908-hue/transportaion-Frontend
APPROVED_TARGET_AFTER_CONTROLLED_RENAME=appolon1908-hue/freight-platform-frontend
RENAME_STATUS=PREPARED_NOT_RENAMED
```

The current GitHub slug remains the valid clone, workflow, package, source-lock, and deployment identity until an authorized in-place GitHub rename is completed and readback proves the same repository ID, history, default branch, protected SHA, issues, pull requests, releases, rulesets, and environments.

Do not create a second repository with the target name. Do not update server remotes, CI references, image labels, GHCR packages, or deployment manifests to the target before cutover.

See:

- [`repository-name-migration.v1.json`](repository-name-migration.v1.json)
- [`REPOSITORY_NAME_MIGRATION.md`](REPOSITORY_NAME_MIGRATION.md)

## Authority boundary

This repository owns the user-facing applications and shared frontend packages. It must never become the source of business authority: all permissions, state transitions, tenant checks, compliance checks, financial rules, and material write validation must be enforced again by the backend.

## Applications

- Broker and dispatcher UI
- Operations UI
- Administration UI
- Customer portal
- Carrier portal

## Shared packages

- UI design system
- Generated API client
- Authentication helpers
- Permission and capability helpers
- Shared TypeScript types
- Validation schemas
- Maps and geospatial components
- Notifications
- Runtime configuration

## Preferred stack

- Vue 3
- TypeScript
- Vite
- Composition API and `<script setup>`
- Pinia
- Vue Router
- TanStack Query
- Zod
- OpenAPI-generated API client
- Vitest
- Playwright

See `docs/FRONTEND_ARCHITECTURE.md` for the application and routing authority.

A repository rename does not authorize a build, deployment, portal activation, tender, dispatch, financial mutation, notification, external provider operation, or production traffic change.