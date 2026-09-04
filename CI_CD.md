# CI/CD authority

## Repository

- Repository: `appolon1908-hue/transportaion-Frontend`
- Class: `frontend`
- Purpose: freight-platform frontend and portals
- Current default branch: governance/documentation only
- Buildable application authority: `fe/release-readiness-v4`

## Persistent branches

```text
development
test
staging
production
main
```

Promotion order:

```text
feature/fix -> development -> test -> staging -> production -> main
```

The initial bootstrap places the CI/CD policy on every persistent branch. That does not promote the application or authorize deployment.

## Required CI

`.github/workflows/required-ci.yml` runs for every branch push, pull request, and manual dispatch. It proves an exact clean checkout, runs checksum-verified secret scanning, validates JSON/YAML/Markdown, installs and audits Node dependencies, runs declared lint/typecheck/test/build scripts, validates Compose, builds Dockerfiles, and uploads sanitized evidence.

When a pull request from `fe/release-readiness-v4` targets `development`, the base-branch workflow checks out and validates that exact application head.

## Every-branch audit

`.github/workflows/all-branches-audit.yml` runs daily and manually. It validates every legacy and persistent branch tip in an isolated worktree without changing branch history.

## Continuous delivery

`.github/workflows/continuous-delivery.yml` runs only on the five persistent branches. It produces deterministic source/build bundles, exact Git SHA/tree evidence, SHA-256 checksums, and an immutable GHCR image from `staging`, `production`, or `main` only when a Dockerfile and committed dependency lockfiles are present.

Runtime deployment and external effects remain unauthorized. A separate protected-environment deployment must prove exact digest readback, health, monitoring, backup/restore, and rollback.

## Current source gate

`main` does not currently contain the buildable freight frontend. Delivery on the policy-only persistent branches therefore fails closed until `fe/release-readiness-v4` is independently reviewed and promoted into `development`, then through the branch train.

## Required GitHub settings

Protect all five persistent branches or apply equivalent rulesets. Require `required-ci`, approving review, resolved conversations, linear history, no force pushes, no deletion, and an up-to-date head before promotion.
