# Next Steps

## Tasks
- [ ] Audit repos and migrate docs per instructions (owner: codex, due: 2025-02-05)
- [ ] Authenticate and sync required submodules (git submodule update --init --recursive prompts for GitHub credentials) (owner: codex)
- [ ] Add CODEOWNERS coverage for workspace root paths touched in this change (owner: codex)
- [ ] Remediate OSV scanner alerts for `mcp` (GHSA-3qhf-m339-9g5v, GHSA-j975-95f5-7wqh) in `mcp/docs_server/requirements.txt` (owner: codex)

## Steps

- [ ] Audit repos and migrate docs per instructions (owner: codex, due: 2025-02-05)
- [x] Restore pnpm workspace install (use `scripts/bootstrap-workspace.sh` to init submodules then run `pnpm install`) (owner: codex)
- [x] Authenticate and sync required submodules (script now supports `GH_SUBMODULE_TOKEN` + `git submodule update --init --recursive`) (owner: codex)
- [x] Add CODEOWNERS coverage for workspace root paths touched in this change (owner: codex)
- [ ] Mirror Antora/Vale/Lychee workflows + Markdown→AsciiDoc migrations across repos listed in `docs/modules/ROOT/pages/migration-status.adoc` once private submodules are available (owner: codex)

## Steps

1. Establish baseline per repo instructions.
2. Plan migration tasks and update docs references.
3. Run full QC suite before commits.

## Deliverables
- Updated docs across repos.
- Updated nav entries and playbook.
- Passing CI workflows.

## Quality Gates
- tests: pass
- linters/formatters: clean
- type-checks: clean
- security scan: clean
- coverage: ≥ baseline
- build: success
- docs updated

## Links
- PRs: TBD
- Files/lines: TBD

## Risks/Notes
- Pending baseline runs and repo-specific CI alignment.
- `osv-scanner` detected two outstanding `mcp` PyPI advisories and could not parse `requirements.workspace.txt`; follow-up task added for remediation.
