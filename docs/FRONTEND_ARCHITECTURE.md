# Freight Platform Frontend Architecture

Canonical project name: `freight-platform-frontend`

## Applications

### Broker / Dispatcher UI
- Dashboard
- Customers
- Quotes
- Shipments
- Loads
- Carrier search
- Tendering
- Dispatch board
- Tracking
- Documents
- Invoices
- Settlements
- Exceptions
- Reports

### Operations UI
- Global operational dashboard
- Exception queue
- Load board
- Shipment monitoring
- Tracking visibility
- Manual overrides
- Tasks / escalations
- Replay and recovery tooling

### Administration UI
- Tenants
- Organizations
- Users
- Roles
- Permissions
- Capabilities
- Configuration
- Audit
- Integration settings
- Notification templates
- Operational health

### Customer Portal
- Dashboard
- Quote requests
- Quotes
- Bookings / shipments
- Tracking
- Documents
- POD
- Invoices
- Reports
- Locations
- Users
- Settings
- Problem reporting

### Carrier Portal
- Available loads
- Offers / bids
- My loads
- Dispatch
- Drivers
- Equipment
- Tracking
- Documents
- Accessorials
- Invoices
- Payments / settlements
- Compliance
- Performance
- Settings

## Shared packages

```text
packages/
├── ui/
├── api-client/
├── auth/
├── permissions/
├── types/
├── validation/
├── maps/
├── notifications/
└── config/
```

## Target repository tree

```text
freight-platform-frontend/
├── apps/
│   ├── broker/
│   ├── operations/
│   ├── admin/
│   ├── customer-portal/
│   └── carrier-portal/
├── packages/
│   ├── ui/
│   ├── api-client/
│   ├── auth/
│   ├── permissions/
│   ├── types/
│   ├── validation/
│   ├── maps/
│   ├── notifications/
│   └── config/
├── tests/
│   ├── unit/
│   ├── component/
│   └── e2e/
└── .github/workflows/
```

## Preferred stack

- Vue 3
- TypeScript
- Vite
- Composition API with `<script setup>`
- Pinia
- Vue Router
- TanStack Query
- Zod
- OpenAPI-generated API client
- Vitest
- Playwright

## Security boundary

The frontend is never authoritative for business decisions. Hiding or disabling controls is UX only. Every material action is revalidated by the backend for authentication, tenant scope, permission, capability, resource access, optimistic concurrency, valid state transition, compliance, and idempotency.

## Integration contract

- Frontend consumes versioned `/api/v1` backend endpoints.
- API types should be generated from backend OpenAPI rather than hand-maintained duplicates.
- No provider secrets are stored in frontend code or browser storage.
- No direct browser-to-provider calls for privileged operations.
- Authentication uses the approved OIDC flow and backend-authorized scopes/permissions.
- Capability flags control UI exposure but do not replace backend gates.

## Production expectations

- Route-level access guards
- Permission/capability-aware navigation
- Centralized API error handling
- Correlation/request IDs surfaced for support
- Accessibility testing
- Responsive desktop operations layouts
- Safe upload/download UX
- Session expiration/re-authentication behavior
- Component/unit tests
- Critical-flow Playwright E2E coverage
- Build, lint, typecheck and test gates in CI
