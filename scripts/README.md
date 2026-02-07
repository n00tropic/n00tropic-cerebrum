# Scripts overview

Canonical entry points (use these first):

- `pnpm-migrate.mjs`: orchestrates npm→pnpm migration helpers (find, replace-npm, replace-npx, or `all`).
- `setup-pnpm.sh`: prepare pnpm (pinned 10.28.2) via corepack with npm fallback.
- `sync-trunk-defs.mjs` / `.dev/automation/scripts/sync-trunk.py`: keep Trunk configs in sync; prefer the Python version when running from CI.
- `find-npm-usages.mjs`: fast scan for stray npm commands (used by `pnpm-migrate find`).
- `remove-nx-cache.sh`: clean Nx cache across the workspace.
- `lint-python.mjs`: workspace Python lint orchestrator (ruff/black/isort) invoked by CI.
- `validate-docs.mjs`: Antora/markdown validation wrapper.
- `penpot:smoke` (root package script): dry-run check for newer Penpot Docker tags; fails on drift without modifying files.
- `lint:imports` (root → n00plicate): enforces token import policy, rejecting `dist/` token paths.
- `format-workspace.mjs`: Prettier wrapper with default workspace globs; supports `--scope` or `--pattern` overrides.
- `run-trunk.sh`: wrapper for Trunk with workspace-local `TMPDIR` and `XDG_CACHE_HOME`.
- `cleanup-trunk-cache.sh`: clears workspace-local Trunk temp/cache artifacts.
- `check-toolchain-pins.mjs`: validates Node and pnpm store pins.
- `local-preflight.sh`: chains toolchain checks, sync, install/update, and QA with flags.
- `generate-script-catalog.mjs`: generates `scripts/script-catalog.md` with all scripts by category.
- `analyze-script-duplicates.mjs`: generates `scripts/script-duplicates.md` to highlight duplicate script basenames.
- `wrap-automation-duplicates.mjs`: replaces identical automation duplicates with wrappers.
- `sync-frontier-template-exports.sh`: renders frontier templates and syncs outputs to resources.
- `validate-frontier-template-exports.sh`: checks for drift between templates and resources.
- `bootstrap-repo.sh`: scaffold a new workspace repo and append it to `automation/workspace.manifest.json` (docs+scripts stubs, README).
- `tidy-submodules.sh`: sync/update submodules, run manifest gate, and skeleton check (dry-run); invoked by the local pre-push hook.
- `sync-venvs.py`: create/update per-repo Python venvs from the manifest (supports --full and --check, uses uv).
- `sync-node-version.sh --from-system`: pins Node to the active system (nvm) version and syncs manifests/configs.
- `sync-typescript-version.mjs`: align TypeScript versions in package.json files with the toolchain manifest.
- `sync-ecmascript-target.mjs`: align tsconfig base targets/libs with the toolchain manifest.
- `sync-storybook-version.mjs`: align Storybook package versions with the toolchain manifest.
- `pnpm-install-safe.sh`: workspace install/update wrapper that uses a local store and preflight dependency checks.
- `commit-upgrade-helper.mjs`: prints a clean status/diff summary and a commit template for upgrade runs.
- `preflight-pnpm-deps.mjs`: validates that dependency ranges exist upstream before installing.
- `install-workspace.sh`: simple wrapper that runs the safe pnpm install/update flow.
- `preflight-allowlist.txt`: optional dependency allowlist for private or unpublished packages.
- `run-typedoc.mjs`: resolves TypeDoc from workspace or local node_modules.
- `regenerate-n00menon-docs.sh`: rebuilds n00menon TypeDoc output with safe install fallback.

Deprecated in favor of `pnpm-migrate`:

- `replace-npx-with-pnpm.mjs`
- `replace-npm-commands-with-pnpm.mjs`
- `find-npm-usages.mjs` (still callable directly but prefer `pnpm-migrate find`)

Script consolidation policy:

- Prefer a single canonical implementation under `.dev/automation/scripts` or root `scripts/`, with thin wrappers in subrepos.
- Keep wrappers minimal: locate workspace root, call the canonical script, and pass through args.
- Avoid copying logic into subrepos unless the behavior is intentionally divergent.
- Template/example scripts stay local to templates and are not consolidated.
- Regenerate `scripts/script-catalog.md` and `scripts/script-duplicates.md` after changes.

Wrapper templates:

- Bash wrapper:

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  ROOT=$(git -C "$(dirname \"$0\")" rev-parse --show-toplevel)
  SCRIPT="$ROOT/.dev/automation/scripts/<path>.sh"

  bash "$SCRIPT" "$@"
  ```

- Python wrapper:

  ```python
  #!/usr/bin/env python3
  """Wrapper for the canonical automation script."""

  from __future__ import annotations

  import subprocess
  from pathlib import Path

  ROOT = Path(__file__).resolve()
  ROOT = Path(
      subprocess.check_output(
        ["git", "-C", str(ROOT.parent), "rev-parse", "--show-toplevel"],
        text=True,
      ).strip()
  )
  SCRIPT = ROOT / ".dev" / "automation" / "scripts" / "<path>.py"

  raise SystemExit(
      subprocess.call(["python3", str(SCRIPT), *__import__("sys").argv[1:]])
  )
  ```

Notes:

- Scripts assume toolchain pins tracked in `.nvmrc` (currently Node 25.6.0), pnpm 10.28.2, Python 3.11.9, Go/Trunk 1.25.0, TypeScript 5.9.3, and Storybook 10.2.7. Update `.nvmrc` + `n00-cortex/data/toolchain-manifest.json` together so local shells and CI stay aligned.
- Avoid editing under `node_modules`, `.pnpm`, `dist`, or `artifacts`; most scripts skip these directories already.
- `upgrade-workspace.mjs` supports partial runs with `--skip-node-sync`, `--skip-compiler-sync`, `--skip-deps`, `--skip-containers`, `--skip-venvs`, `--skip-build`, and `--skip-health`.
- `upgrade-workspace.mjs` optional prep flags: `--with-approve-builds` and `--with-prune`.
- `preflight-pnpm-deps.mjs` supports `PREFLIGHT_ALLOWLIST`, `PREFLIGHT_ALLOWLIST_FILE`, `PREFLIGHT_SKIP_SCOPED=1`, and `PREFLIGHT_SKIP_SCOPES` to bypass private registry ranges.
- `install-workspace.sh` flags: `install|update`, `--no-preflight`, `--allowlist`, `--allowlist-file`, `--skip-scoped`, `--skip-scopes`.
