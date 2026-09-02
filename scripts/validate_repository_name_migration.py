#!/usr/bin/env python3
"""Validate the controlled freight frontend repository-name migration."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "repository-name-migration.v1.json"
SOURCE_AUTHORITY = ROOT / "config" / "repository-source-authority.v1.json"
README = ROOT / "README.md"
RUNBOOK = ROOT / "REPOSITORY_NAME_MIGRATION.md"
WORKFLOW = ROOT / ".github" / "workflows" / "repository-name-migration.yml"
VALIDATOR = Path(__file__).resolve()
CURRENT = "appolon1908-hue/transportaion-Frontend"
TARGET = "appolon1908-hue/freight-platform-frontend"

EXCLUDED_PARTS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "coverage",
    "dist",
    "node_modules",
}
AUTHORITY_FILES = {
    MANIFEST.resolve(),
    SOURCE_AUTHORITY.resolve(),
    README.resolve(),
    RUNBOOK.resolve(),
    VALIDATOR,
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        fail(f"required authority file is missing: {path.relative_to(ROOT)}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")
    if not isinstance(value, dict):
        fail(f"JSON root must be an object: {path.relative_to(ROOT)}")
    return value


def validate_manifest(document: dict[str, Any]) -> None:
    expected = {
        "schema_version": "1.0",
        "repository_id": 1343761049,
        "current_repository": CURRENT,
        "target_repository_after_cutover": TARGET,
        "status": "PREPARED_NOT_RENAMED",
        "runtime_critical": True,
        "current_runtime_state": "SOURCE_ONLY_NOT_DEPLOYED",
        "runtime_digest_evidence": "REQUIRED_WHEN_DEPLOYED_OTHERWISE_NOT_APPLICABLE",
        "authority_role": "Freight brokerage and 3PL frontend",
        "account_authority": (
            "appolon1908-hue/documentaions:repository-name-migration.v1.json"
        ),
        "source_authority_manifest": "config/repository-source-authority.v1.json",
    }
    for key, value in expected.items():
        if document.get(key) != value:
            fail(f"repository migration field {key} is incorrect")

    policy = document.get("policy")
    if not isinstance(policy, dict):
        fail("repository migration policy is missing")
    for key in (
        "current_repository_remains_operational",
        "current_repository_bound_to_active_automation",
        "deployment_consumer_inventory_required",
        "target_repository_forbidden_in_automation_before_cutover",
        "same_repository_id_required_after_cutover",
        "historical_evidence_immutable",
        "all_inventoried_integrations_require_post_rename_readback",
        "runtime_digest_must_remain_unchanged_when_deployed",
        "rollback_digest_must_remain_unchanged_when_deployed",
        "absent_runtime_digest_must_be_recorded_as_not_applicable",
        "success_path_must_restore_freeze_state",
        "rollback_path_must_restore_freeze_state",
    ):
        if policy.get(key) is not True:
            fail(f"required fail-closed migration policy is not true: {key}")
    if policy.get("rename_authorizes_deployment") is not False:
        fail("repository rename must not authorize deployment")


def validate_source_authority(document: dict[str, Any]) -> None:
    expected = {
        "schema_version": "1.0",
        "repository_id": 1343761049,
        "current_repository": CURRENT,
        "rename_status": "PREPARED_NOT_RENAMED",
        "source_authority": "CURRENT_REPOSITORY",
        "application_role": "Freight brokerage and 3PL frontend",
        "deployment_state": "NOT_DEPLOYED",
        "runtime_evidence": "NOT_APPLICABLE_NOT_DEPLOYED",
        "active_automation_consumer": ".github/workflows/repository-name-migration.yml",
    }
    for key, value in expected.items():
        if document.get(key) != value:
            fail(f"source authority field {key} is incorrect")

    for key in ("active_deployment_consumers", "server_checkout_remotes"):
        if document.get(key) != []:
            fail(f"source-only repository must record an empty {key} list")
    for key in ("runtime_image_digest", "rollback_image_digest"):
        if document.get(key) is not None:
            fail(f"non-deployed source must record {key}=null")

    rules = document.get("rules")
    if not isinstance(rules, dict):
        fail("source authority rules are missing")
    for key in (
        "workflow_must_assert_current_repository",
        "current_repository_required_before_cutover",
        "target_repository_forbidden_before_verified_cutover",
        "deployment_must_not_be_invented",
        "runtime_digest_required_when_deployed",
        "rollback_digest_required_when_deployed",
    ):
        if rules.get(key) is not True:
            fail(f"source authority rule is not true: {key}")


def validate_workflow() -> None:
    if not WORKFLOW.is_file():
        fail("repository-name authority workflow is missing")
    text = WORKFLOW.read_text(encoding="utf-8")
    for required in (
        "pull_request:",
        "push:",
        "branches:",
        "- main",
        "EXPECTED_REPOSITORY_FULL_NAME: appolon1908-hue/transportaion-Frontend",
        "persist-credentials: false",
        "python scripts/validate_repository_name_migration.py",
    ):
        if required not in text:
            fail(f"repository-name authority workflow is missing: {required}")
    if "paths:" in text or "paths-ignore:" in text:
        fail("repository-name authority workflow must run for every change")

    expected_environment = os.getenv("EXPECTED_REPOSITORY_FULL_NAME")
    if expected_environment is not None and expected_environment != CURRENT:
        fail("workflow expected repository does not match the current operational slug")
    github_repository = os.getenv("GITHUB_REPOSITORY")
    if github_repository is not None and github_repository != CURRENT:
        fail(
            "GitHub Actions is executing in a repository other than the current "
            f"pre-cutover authority: {github_repository}"
        )


def validate_readme() -> None:
    readme = README.read_text(encoding="utf-8")
    for required in (
        "STABLE_GITHUB_REPOSITORY_ID=1343761049",
        f"CURRENT_OPERATIONAL_REPOSITORY={CURRENT}",
        f"APPROVED_TARGET_AFTER_CONTROLLED_RENAME={TARGET}",
        "RENAME_STATUS=PREPARED_NOT_RENAMED",
        "Canonical frontend authority for the freight brokerage and 3PL operating platform",
    ):
        if required not in readme:
            fail(f"README is missing stable repository evidence: {required}")


def validate_runbook() -> None:
    runbook = RUNBOOK.read_text(encoding="utf-8")
    for required in (
        "CURRENT_RUNTIME_STATE=SOURCE_ONLY_NOT_DEPLOYED",
        "SOURCE_AUTHORITY=config/repository-source-authority.v1.json",
        "POST_RENAME_INTEGRATION_READBACK=PASS",
        "ACTIONS_REQUIRED_CHECKS=PASS",
        "PACKAGES_GHCR=PASS|N/A",
        "DEPLOY_KEYS_APPS_WEBHOOKS=PASS|N/A",
        "DOWNSTREAM_CONSUMERS=PASS",
        "CURRENT_RUNTIME_STATE=DEPLOYED|NOT_DEPLOYED",
        "DEPLOYED_FRONTEND_IMAGE_DIGEST=<immutable-digest>|N/A",
        "ROLLBACK_FRONTEND_IMAGE_DIGEST=<immutable-digest>|N/A",
        "RUNTIME_DIGEST_UNCHANGED=PASS|N/A",
        "ROLLBACK_DIGEST_UNCHANGED=PASS|N/A",
        "MERGES_UNFROZEN=PASS",
        "RELEASE_DISPATCH_UNFROZEN=PASS|N/A",
        "WORKFLOW_DISPATCH_UNFROZEN=PASS|N/A",
        "DEPLOYMENT_DISPATCH_RESTORED=PASS|N/A",
        "ROLLBACK_UNFREEZE=PASS|N/A",
        "Do not leave the repository frozen.",
        "do not fabricate runtime evidence.",
        "WORKLOADS_RESTARTED=0",
        "IMAGES_REBUILT=0",
        "DATABASE_MIGRATIONS=0",
        "TENDERING_ENABLED=NO_CHANGE",
        "DISPATCH_ENABLED=NO_CHANGE",
        "PRODUCTION_TRAFFIC_CHANGED=NO",
    ):
        if required not in runbook:
            fail(f"rename runbook is missing required evidence: {required}")


def validate_target_absent() -> None:
    target = TARGET.lower()
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.resolve() in AUTHORITY_FILES:
            continue
        try:
            relative = path.resolve().relative_to(ROOT.resolve())
        except ValueError:
            continue
        if any(part in EXCLUDED_PARTS for part in relative.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore").lower()
        if target in text:
            fail(
                "target repository is used by active source before cutover: "
                f"{relative}"
            )


def validate() -> None:
    manifest = load(MANIFEST)
    source_authority = load(SOURCE_AUTHORITY)
    validate_manifest(manifest)
    validate_source_authority(source_authority)
    validate_workflow()
    validate_readme()
    validate_runbook()
    validate_target_absent()


def main() -> None:
    validate()
    print("Freight frontend repository-name migration authority: PASS")


if __name__ == "__main__":
    main()
