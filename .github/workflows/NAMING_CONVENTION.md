# CI/CD Workflow Naming Convention

This document defines the standard naming convention for GitHub Actions workflows in the n00tropic-cerebrum superproject.

## Naming Pattern

```
<scope>-<action>-<trigger>.yml
```

### Components

| Component | Description                          | Examples                                                        |
| --------- | ------------------------------------ | --------------------------------------------------------------- |
| `scope`   | The affected system or domain        | `workspace`, `cortex`, `frontiers`, `docs`, `deps`, `toolchain` |
| `action`  | The primary action performed         | `health`, `validate`, `sync`, `check`, `deploy`, `build`        |
| `trigger` | The event that triggers the workflow | `pr`, `push`, `nightly`, `manual`, `schedule`                   |

## Workflow Inventory

### Root Workflows (/.github/workflows/)

| Current Name                    | Proposed Name                       | Scope      | Action        | Trigger  |
| ------------------------------- | ----------------------------------- | ---------- | ------------- | -------- |
| `workspace-health.yml`          | `workspace-health-pr-push.yml`      | workspace  | health        | pr-push  |
| `toolchain-pins.yml`            | `toolchain-check-pr.yml`            | toolchain  | check         | pr       |
| `toolchain-verify.yml`          | `toolchain-verify-schedule.yml`     | toolchain  | verify        | schedule |
| `deps-drift.yml`                | `deps-drift-nightly.yml`            | deps       | drift         | nightly  |
| `docs.yml`                      | `docs-build-deploy-push.yml`        | docs       | build-deploy  | push     |
| `docs-sync.yml`                 | `docs-sync-pr.yml`                  | docs       | sync          | pr       |
| `docs-ci-strict.yml`            | `docs-validate-pr.yml`              | docs       | validate      | pr       |
| `nightly-docs.yml`              | `docs-build-nightly.yml`            | docs       | build         | nightly  |
| `nightly-guards.yml`            | `workspace-guards-nightly.yml`      | workspace  | guards        | nightly  |
| `nightly-tags.yml`              | `docs-tags-nightly.yml`             | docs       | tags          | nightly  |
| `fusion-pipeline-ci.yml`        | `fusion-pipeline-pr.yml`            | fusion     | pipeline      | pr       |
| `horizons-metadata.yml`         | `horizons-validate-pr.yml`          | horizons   | validate      | pr       |
| `lint-fast.yml`                 | `workspace-lint-pr.yml`             | workspace  | lint          | pr       |
| `merge-to-minimal-set.yml`      | `workspace-merge-schedule.yml`      | workspace  | merge         | schedule |
| `n00menon-complete.yml`         | `n00menon-build-pr-push.yml`        | n00menon   | build         | pr-push  |
| `ops-housekeeping.yml`          | `workspace-cleanup-schedule.yml`    | workspace  | cleanup       | schedule |
| `penpot-export.yml`             | `penpot-export-schedule.yml`        | penpot     | export        | schedule |
| `penpot-smoke.yml`              | `penpot-smoke-pr.yml`               | penpot     | smoke         | pr       |
| `planner.yml`                   | `planner-run-schedule.yml`          | planner    | run           | schedule |
| `planner-training.yml`          | `planner-training-schedule.yml`     | planner    | training      | schedule |
| `python-lock-check.yml`         | `python-lock-validate-pr.yml`       | python     | lock-validate | pr       |
| `renovate-config-validator.yml` | `renovate-config-check-pr.yml`      | renovate   | config-check  | pr       |
| `renovate-extends-check.yml`    | `renovate-extends-check-pr.yml`     | renovate   | extends-check | pr       |
| `renovate-extends-apply.yml`    | `renovate-extends-apply-manual.yml` | renovate   | extends-apply | manual   |
| `runners-nightly.yml`           | `runners-health-nightly.yml`        | runners    | health        | nightly  |
| `sbom.yml`                      | `deps-sbom-generate-schedule.yml`   | deps       | sbom-generate | schedule |
| `search-reindex.yml`            | `search-reindex-schedule.yml`       | search     | reindex       | schedule |
| `tokens-presence.yml`           | `tokens-check-pr.yml`               | tokens     | check         | pr       |
| `trunk-sync.yml`                | `trunk-sync-pr.yml`                 | trunk      | sync          | pr       |
| `trunk-sync-apply.yml`          | `trunk-sync-apply-manual.yml`       | trunk      | sync-apply    | manual   |
| `trunk-upgrade-recursive.yml`   | `trunk-upgrade-schedule.yml`        | trunk      | upgrade       | schedule |
| `wrangle-branches.yml`          | `workspace-branches-schedule.yml`   | workspace  | branches      | schedule |
| `capability-health.yml`         | `capability-health-check-pr.yml`    | capability | health-check  | pr       |
| `graph-stub.yml`                | `workspace-graph-stub-pr.yml`       | workspace  | graph-stub    | pr       |

### Reusable Workflows (/.github/reusable-workflows/)

Reusable workflows should follow a similar pattern but be prefixed with `reusable-`:

```
reusable-<scope>-<action>.yml
```

Examples:

- `reusable-workspace-setup.yml`
- `reusable-python-test.yml`
- `reusable-node-test.yml`

## Migration Plan

1. Create new workflows with proper names
2. Update references in documentation
3. Deprecate old workflows with warnings
4. Remove old workflows after 30 days

## Workflow Categories

### Workspace Management

- `workspace-*` - Workspace-wide operations
- `runners-*` - Runner management

### Toolchain & Dependencies

- `toolchain-*` - Toolchain verification
- `deps-*` - Dependency management
- `python-*` - Python-specific
- `renovate-*` - Renovate automation

### Documentation

- `docs-*` - Documentation building and deployment
- `search-*` - Search indexing

### Subproject Specific

- `cortex-*` - n00-cortex operations
- `frontiers-*` - n00-frontiers operations
- `fusion-*` - n00clear-fusion operations
- `horizons-*` - n00-horizons operations
- `menon-*` - n00menon operations
- `planner-*` - Planner operations
- `penpot-*` - Penpot operations
- `tokens-*` - Design tokens

### Quality & Security

- `trunk-*` - Trunk linting
- `sbom-*` - SBOM generation

## Best Practices

1. **Be specific**: Use precise scope names (e.g., `cortex-validate` not `check`)
2. **One responsibility**: Each workflow should do one thing well
3. **Clear triggers**: Document when workflows run
4. **Consistent naming**: Follow the pattern strictly
5. **Document purpose**: Add header comments explaining the workflow
