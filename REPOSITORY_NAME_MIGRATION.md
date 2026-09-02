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

The current full name remains operational until an authorized GitHub rename is completed and repository ID `1343761049`, visibility, default branch, protected SHA, history, issues, pull requests, releases, rules, workflows, packages, and integrations are read back unchanged.

The current repository evidence describes source and documentation only; it does not prove a deployed frontend runtime. Runtime-critical means future deployment consumers must be protected during cutover. It does not permit an operator to invent an image digest that does not exist.

## Required pre-cutover inventory

Capture the default-branch SHA, visibility, protection and rulesets, CODEOWNERS, required checks, workflow and Environment inventory, reusable-workflow references, deploy-key fingerprints, webhooks and GitHub Apps, package and GHCR identities, badges, infrastructure and source-lock references, developer and server remotes, and the exact merge and dispatch state being frozen. Record names and fingerprints only; do not print secret values.

Re-evaluate runtime state immediately before the rename:

- when a reviewed staging or production deployment exists, record its exact immutable frontend image and rollback digests, then prove both remain unchanged during the metadata-only rename;
- when no deployment exists, record `CURRENT_RUNTIME_STATE=NOT_DEPLOYED`, `DEPLOYED_FRONTEND_IMAGE_DIGEST=N/A`, and `RUNTIME_DIGEST_UNCHANGED=N/A`;
- do not fabricate runtime evidence.

## Controlled cutover

1. Merge stable-ID alias awareness into Grafana, Prometheus, Middleware, infrastructure, documentation, and other active consumers.
2. Freeze merges, release dispatches, workflow dispatches, and deployment dispatches for this repository; record the prior state.
3. Rename only this repository to `freight-platform-frontend` through an authorized owner or administrator action.
4. Before changing consumers, prove the same repository ID, visibility, default branch and SHA, history, protection, CODEOWNERS, required checks, issues, pull requests, tags, releases, Actions, reusable workflows, Environments, packages, GHCR identities, deploy keys, GitHub Apps, webhooks, and Pages state.
5. Stop and roll back if any inventoried integration is missing, weakened, or unresolved.
6. Update only mutable repository URLs, image-source labels, workflow references, badges, package metadata, server remotes, and deployment manifests. Preserve dated evidence and historical source locks exactly as captured.
7. Verify frontend build, CI, package resolution, clone, fetch, push, release dry run, deployment preflight, and every downstream consumer.
8. When a deployment exists, verify its running image digest is unchanged. When no deployment exists, retain an explicit `N/A` result instead of claiming runtime validation.
9. Verify no freight operation, tender, dispatch, financial mutation, notification, external provider effect, or production traffic is activated.
10. Rehearse rollback to the prior slug.
11. After success or validated rollback, restore the exact recorded merge, release-dispatch, workflow-dispatch, and deployment-dispatch state. Do not leave the repository frozen.

## Rollback

Rollback restores the prior slug when safe, restores mutable references and remote URLs from the checksum-bound pre-change packet, repeats the complete repository, Actions, checks, Environments, package, deploy-key, GitHub App, webhook, downstream-consumer, and runtime readback, verifies no freight capability changed, and then restores the recorded freeze state. A successful rollback must not leave normal repository operations disabled.

A metadata-only rename must produce:

```text
POST_RENAME_INTEGRATION_READBACK=PASS
ACTIONS_REQUIRED_CHECKS=PASS
PACKAGES_GHCR=PASS|N/A
DEPLOY_KEYS_APPS_WEBHOOKS=PASS|N/A
DOWNSTREAM_CONSUMERS=PASS
WORKLOADS_RESTARTED=0
IMAGES_REBUILT=0
DATABASE_MIGRATIONS=0
TENDERING_ENABLED=NO_CHANGE
DISPATCH_ENABLED=NO_CHANGE
PRODUCTION_TRAFFIC_CHANGED=NO
CURRENT_RUNTIME_STATE=DEPLOYED|NOT_DEPLOYED
DEPLOYED_FRONTEND_IMAGE_DIGEST=<immutable-digest>|N/A
RUNTIME_DIGEST_UNCHANGED=PASS|N/A
MERGES_UNFROZEN=PASS
RELEASE_DISPATCH_UNFROZEN=PASS|N/A
WORKFLOW_DISPATCH_UNFROZEN=PASS|N/A
DEPLOYMENT_DISPATCH_RESTORED=PASS|N/A
ROLLBACK_UNFREEZE=PASS|N/A
```

The account-wide mapping is governed by `appolon1908-hue/documentaions:repository-name-migration.v1.json` until that documentation repository completes its own controlled rename.
