# Repository-name migration record

```text
REPOSITORY_ID=1343761049
CURRENT_FULL_NAME=appolon1908-hue/transportaion-Frontend
TARGET_FULL_NAME=appolon1908-hue/freight-platform-frontend
STATUS=PREPARED_NOT_RENAMED
RUNTIME_CRITICAL=YES
```

## Authority decision

The repository already identifies its product as `freight-platform-frontend`. The approved target GitHub slug therefore corrects the spelling error and aligns the repository name with its documented authority.

The current full name remains operational until an authorized GitHub rename is completed and repository ID `1343761049`, visibility, default branch, protected SHA, issues, pull requests, releases, and rules are read back unchanged.

## Required pre-cutover inventory

Capture the default-branch SHA, protection/rulesets, workflow and Environment inventory, required checks, deploy-key fingerprints, webhooks and GitHub Apps, package/GHCR names, badges, reusable workflows, infrastructure references, developer/server remotes, and deployed frontend image digest. Record names and fingerprints only; do not print secret values.

## Controlled cutover

1. Merge alias-awareness into active Grafana, infrastructure, documentation, and release consumers.
2. Freeze this repository's merges and deployments.
3. Rename only this repository to `freight-platform-frontend`.
4. Prove stable repository ID and exact default SHA continuity.
5. Update mutable repository URLs, image-source labels, workflow references, badges, server remotes, and deployment manifests.
6. Preserve dated evidence and source locks exactly as captured.
7. Verify frontend build, CI, package resolution, clone/fetch/push, and release dry run.
8. Verify the running image digest is unchanged and no freight operation is activated.
9. Rehearse rollback to the prior slug.

A metadata-only rename must produce:

```text
WORKLOADS_RESTARTED=0
IMAGES_REBUILT=0
DATABASE_MIGRATIONS=0
TENDERING_ENABLED=NO_CHANGE
DISPATCH_ENABLED=NO_CHANGE
PRODUCTION_TRAFFIC_CHANGED=NO
```

The account-wide mapping is governed by `appolon1908-hue/documentaions:repository-name-migration.v1.json` until that documentation repository completes its own controlled rename.