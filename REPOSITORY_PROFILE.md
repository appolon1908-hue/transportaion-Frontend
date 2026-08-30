# Repository Profile — `transportaion-Frontend`

## Identity

- **Repository:** `appolon1908-hue/transportaion-Frontend`
- **Category:** Product frontend — freight brokerage
- **Visibility:** `public`
- **Default branch:** `main`
- **Authority:** Primary freight-platform frontend authority
- **Status:** Vue/TypeScript architecture for broker, operations, administration, customer, and carrier applications.

## Purpose

Provides the user-facing freight brokerage and 3PL applications, portals, design system, generated API client, mapping components, notifications, and authentication helpers.

## Owns

- Broker/dispatcher and operations interfaces
- Administration, customer, and carrier portals
- Shared frontend packages, validation, maps, notifications, and typed API consumption

## Does not own

- Shipment, tender, dispatch, compliance, finance, or authorization truth
- Direct external-provider writes
- Backend state transitions or tenant enforcement

## Key integrations

- `transportation-backend-`
- Keycloak
- Maps and geospatial services through backend contracts
- Governed communications APIs

## Current priorities

1. Build portal shells and the shared design system
2. Generate the API client from the backend OpenAPI contract
3. Implement safe shipment, tender, dispatch, tracking, and document workflows
4. Add unit, Playwright, accessibility, mobile, and production-build gates

## Governance and safety

- Promotion model: `feature/docs/fix/security/upgrade -> development -> test -> staging -> production -> main`.
- Use pull requests with exact-head and merge-result validation; source merge never authorizes deployment.
- Never place secrets, provider credentials, or authoritative business rules in the browser.
- Production assets must be immutable and external effects backend-authoritative.
- This document does not tender loads, dispatch carriers, send messages, post financial entries, or activate production.

## Account-wide catalog

See `appolon1908-hue/documentaions/REPOSITORY_CATALOG.md`.
