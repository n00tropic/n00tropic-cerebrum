# Workspace Maintenance Runbook

This guide keeps the federated workspace healthy whether you are preparing a pull request or refreshing a long-lived clone.

## 1. Assess the Workspace

```bash
./.dev/automation/scripts/workspace-health.sh --strict-submodules --json
```

- **Goal**: ensure every submodule is clean and aligned with its upstream.
- Add `--sync-submodules` when reviving a stale clone, or `--fix-all` to run submodule + trunk sync together.
- Use `--repo-cmd n00-cortex:"git status -sb"` for quick targeted diagnostics.

## 2. Fix Drift (if needed)

| Scenario | Action |
| --- | --- |
| Submodule has untracked changes you want to discard | `git -C <repo> checkout -- .` or run `workspace-health --repo-cmd <repo>:"git checkout -- ."` |
| Submodule is behind | `git -C <repo> pull --ff-only` |
| Tooling configs diverged | `./.dev/automation/scripts/sync-trunk.py --pull` (automatically included in `--fix-all`) |
| Workspace root dirty | Commit or stash before release automation |

## 3. Run Cross-Repo Checks

```bash
./.dev/automation/scripts/meta-check.sh
```

This script runs schema validation, Renovate preset verification, CVE scans, and other repo-specific linters.

## 4. Validate Delivery Artefacts

For any metadata-bearing document (ideas, jobs, projects):

```bash
./.dev/automation/scripts/project-preflight.sh --path <doc> --registry <optional registry override>
```

Preflight chains capture, GitHub sync, and ERPNext sync to confirm IDs, links, and review cadence before you share updates.

## 5. Document & Ship

1. Capture relevant ADRs in `1. Cerebrum Docs/ADR/`.
2. Commit per-repo changes and push.
3. Run `./.dev/automation/scripts/workspace-release.sh` when tagging a coordinated drop so release manifests stay in sync.

> Tip: wire the workflow above into automation pipelines (Trunk, CI) to fail fast whenever the workspace drifts.
