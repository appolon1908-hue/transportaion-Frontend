# Repository-name migration record

```text
REPOSITORY_ID=1343761049
CURRENT_FULL_NAME=appolon1908-hue/transportaion-Frontend
TARGET_FULL_NAME=appolon1908-hue/freight-platform-frontend
STATUS=PREPARED_NOT_RENAMED
RUNTIME_CRITICAL=YES
CURRENT_RUNTIME_STATE=SOURCE_ONLY_NOT_DEPLOYED
```

## Authority decision

The repository already identifies its product as `freight-platform-frontend`. The approved target GitHub slug therefore corrects the spelling error and aligns the repository name with its documented authority.

The current full name remains operational until an authorized GitHub rename is completed and repository ID `1343761049`, visibility, default branch, protected SHA, issues, pull requests, releases, and rules are read back unchanged.

The current repository evidence describes source and documentation only; it does not prove a deployed frontend runtime. Runtime-critical means future deployment consumers must be protected during cutover. It does not permit an operator to invent an image digest that does not exist.

## Required pre-cutover inventory

Capture the default-branch SHA, protection and rulesets, workflow and Environment inventory, required checks, deploy-key fingerprints, webhooks and GitHub Apps, package and GHCR names, badges, reusable workflows, infrastructure references, and developer or server remotes. Record names and fingerprints only; do not print secret values.

Re-evaluate runtime state immediately before the rename:

- When a reviewed staging or production deployment exists, record its exact immutable frontend image digest and rollback digest, then prove both remain unchanged during the metadata-only rename.
- When no deployment exists, record `CURRENT_RUNTIME_STATE=NOT_DEPLOYED`, `DEPLOYED_FRONTEND_IMAGE_DIGEST=N/A`, and `RUNTIME_DIGEST_UNCHANGED=N/A`. Do not fabricate runtime evidence.

## Controlled cutover

1. Merge alias-awareness into active Grafana, Prometheus, infrastructure, documentation, Middleware, and release consumers.
2. Freeze this repository's merges, release dispatches, and deployments.
3. Rename only this repository to `freight-platform-frontend`.
4. Prove stable repository ID and exact default SHA continuity.
5. Update mutable repository URLs, image-source labels, workflow references, badges, server remotes, and deployment manifests.
6. Preserve dated evidence and source locks exactly as captured.
7. Verify frontend build, CI, package resolution, clone, fetch, push, and release dry run.
8. When a deployment exists, verify its running image digest is unchanged. When no deployment exists, retain an explicit `N/A` result instead of claiming runtime validation.
9. Verify no freight operation, tender, dispatch, provider effect, or production traffic is activated.
10. Rehearse rollback to the prior slug.

A metadata-only rename must produce:

```text
WORKLOADS_RESTARTED=0
IMAGES_REBUILT=0
DATABASE_MIGRATIONS=0
TENDERING_ENABLED=NO_CHANGE
DISPATCH_ENABLED=NO_CHANGE
PRODUCTION_TRAFFIC_CHANGED=NO
CURRENT_RUNTIME_STATE=DEPLOYED|NOT_DEPLOYED
DEPLOYED_FRONTEND_IMAGE_DIGEST=<immutable-digest>|N/A
RUNTIME_DIGEST_UNCHANGED=PASS|N/A
```

The account-wide mapping is governed by `appolon1908-hue/documentaions:repository-name-migration.v1.json` until that documentation repository completes its own controlled rename.
