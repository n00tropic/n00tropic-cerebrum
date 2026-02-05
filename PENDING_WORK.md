# Pending Work Items

This document tracks active and pending work items extracted from the workspace.

## Active Tasks (from Next_Steps.md)

- [ ] Restore pnpm toolchain + external Trunk binary (owner: codex, due: 2025-02-05)
  - Run `scripts/setup-pnpm.sh` (corepack prepare pnpm@10.23.0; npm global fallback added) and `pnpm install` at workspace root.
  - Install trunk CLI v1.25.4 to `~/.cache/trunk/bin/trunk` (or another runner-level location) and export `TRUNK_BIN`; the workspace no longer ships `.trunk/trunk.yaml`, so runners must source lint configs from `n00-cortex/data/trunk/base/.trunk/` or downstream repos directly.
  - Trunk defs sync script restored at `scripts/sync-trunk-defs.mjs`; invoked automatically by `.dev/automation/scripts/run-trunk-subrepos.sh` against the canonical configs under `n00-cortex/data/trunk/base/.trunk/`.

- [ ] Repair workspace health sync for ephemeral agents (owner: codex)
  - Document bootstrap order for runners: `GH_SUBMODULE_TOKEN` → `scripts/bootstrap-workspace.sh` → `pnpm install` → `scripts/bootstrap-python.sh` → `pnpm exec antora antora-playbook.yml` (skip if private sources unavailable).

- [ ] Fix Python bootstrap notes (owner: codex)
  - Confirm `requirements.workspace.txt` resolves now that submodules exist; keep guidance to activate `.venv-workspace` before running automation.

- [ ] Repair Antora docs build (owner: codex)
  - After pnpm/trunk restore, run `pnpm exec antora antora-playbook.yml --stacktrace`; validate playbook paths for doc branches.

- [ ] Harden MCP servers/prompts/tracing for agent parity (owner: automation/agent platform)
  - Run MCP services from `.venv-workspace`, keep prompt manifests in sync with docs, and ensure OTEL env (`OTEL_EXPORTER_OTLP_ENDPOINT`, `N00_DISABLE_TRACING`) is set before launching ai-workflow/cortex/docs servers.

- [ ] Schedule planner telemetry exports + Typesense freshness guards + dashboard updates (owner: horizons/school PMs)
  - Export `.dev/automation/artifacts/plans/horizons-*.json` into dashboards, refresh `docs/search/logs/typesense-reindex-*.log[.json]` (<7d), and publish planner-GA runs per `docs/modules/ROOT/pages/closing-gaps.adoc`.

## Backlog Items

### From Next_Steps_Log.md (2025-11-29)

- [ ] Execute `job-frontiers-evergreen-ssot` workstreams (docs charter, automation hooks, template expansion, telemetry, generator contracts) so n00-frontiers remains the canonical SSoT. Tracked via ADR-008 and the new horizons job directory.

## Notes

- Completed items have been archived to `1. Cerebrum Docs/archives/next-steps-log-2025.md`
- Auto-generated files like `triage-log.md` and `script_index.md` are now gitignored
- For historical context, see archived logs in `1. Cerebrum Docs/archives/`
