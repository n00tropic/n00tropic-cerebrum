# Next Steps

Active and pending tasks for workspace maintenance and development.

> **Note**: Completed task logs have been archived to `1. Cerebrum Docs/archives/`. For pending work items, see [`PENDING_WORK.md`](./PENDING_WORK.md).
>
> **Project Status**: See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for a high-level dashboard of component states.

## Active Tasks

- [ ] Restore pnpm toolchain + external Trunk binary (owner: codex, due: 2025-02-05)
- [ ] Repair workspace health sync for ephemeral agents (owner: codex)
- [ ] Fix Python bootstrap notes (owner: codex)
- [ ] Repair Antora docs build (owner: codex)
- [ ] Harden MCP servers/prompts/tracing for agent parity (owner: automation/agent platform)
- [ ] Schedule planner telemetry exports + Typesense freshness guards + dashboard updates (owner: horizons/school PMs)

## Steps

1. Bootstrap toolchain (pnpm via corepack; trunk CLI install; python venv via `scripts/bootstrap-python.sh`).
2. Sync submodules and artifacts (`scripts/check-superrepo.sh`, `.dev/automation/scripts/workspace-health.py --sync-submodules --publish-artifact`).
3. Restore linters/formatters (`pnpm -w exec biome check scripts`, `.dev/automation/scripts/run-trunk-subrepos.sh --fmt` once the external `TRUNK_BIN` is available).
4. Rebuild docs and search (`pnpm exec antora antora-playbook.yml`; rerun `docsearch.config.json` workflow if search is enabled).
5. Run security + health (`osv-scanner --config osv-scanner.toml .`, confirm GHSA items cleared).
6. Mirror Antora/Vale/Lychee + Markdown→AsciiDoc migrations across repos listed in `docs/modules/ROOT/pages/migration-status.adoc` when private submodules are reachable.

### Pipeline validation

- `scripts/validate-pipelines.sh --clean` creates temp fixtures, runs preflight → graph export → docs build → fusion (if venv present), and writes logs to `.dev/automation/artifacts/pipeline-validation/latest.json`.
- Validator defaults to the local playbook (`antora-playbook.local.yml`) to avoid remote creds; set `ANTORA_PLAYBOOK=antora-playbook.ci.yml` if you want remote fetch. Provide `GH_SUBMODULE_TOKEN` when hitting private sources.

### Local runners, creds, and CLIs (use local first)

- Each repo has its own environment; prefer running pipelines locally (superproject scripts under `scripts/`, subrepo helpers under their `scripts/` or `.dev/automation/scripts/` folders) before relying on remote runners.
- For private fetches (Antora, submodules), set `GH_SUBMODULE_TOKEN` in your shell; validator auto-wires it via a temporary `git-askpass` if present.
- When credentials are unavailable, fall back to local artifacts and CLIs: run `scripts/validate-pipelines.sh --skip docs` (or `--only graph`) to keep other checks green while you sort access.
- Keep local actions runners/CLIs installed so dev flows stay unblocked; during dev, aim to resolve with local execution first, then remote once credentials are restored/rotated.

## Deliverables

- Restored pnpm toolchain with default pnpm store location and documented external Trunk management.
- Regenerated `artifacts/workspace-health.json`.
- Passing trunk + Biome checks and Antora build.
- OSV scanner clean for `mcp/docs_server`.
- Updated migration status and runner bootstrap notes for agents.

## Quality Gates

- tests: pass
- linters/formatters: clean
- type-checks: clean
- security scan: clean
- coverage: ≥ baseline
- build: success
- docs updated

## Links

- Pending work details: [`PENDING_WORK.md`](./PENDING_WORK.md)
- Archived logs: [`1. Cerebrum Docs/archives/`](./1.%20Cerebrum%20Docs/archives/)
- Submodule/migration tracker: `docs/modules/ROOT/pages/migration-status.adoc`
- Trunk runner: `.dev/automation/scripts/run-trunk-subrepos.sh`
- Workspace health: `.dev/automation/scripts/workspace-health.py`
- Antora playbook: `antora-playbook.yml`

## Risks/Notes

- pnpm toolchain missing on current runner; install via `scripts/setup-pnpm.sh`. Trunk CLI must be installed outside this repo (launcher install script still 404—reuse cached binary or fetch the pinned GitHub release and set `TRUNK_BIN`).
- Antora build and docs migration depend on private submodules being readable (set `GH_SUBMODULE_TOKEN` for ephemeral agents).
