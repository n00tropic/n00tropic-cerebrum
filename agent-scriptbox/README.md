# Agent Scriptbox 🧰

**Automated tools for Superrepo Integrity & Maintenance**

This collection of scripts is designed to prevent and resolve specific friction points encountered in managing the `n00tropic-cerebrum` polyrepo/superrepo. They encapsulate "lessons learned" from debugging sessions into automated checks and actions.

## 1. `check-workspace-integrity.mjs` (The Doctor) 🩺
**Concept**: Proactively detect configuration "drift" and anti-patterns that cause build/lint failures.
**Checks**:
- **Node Version Consistency**: Ensures root `.nvmrc` matches submodule `.nvmrc` files and `package.json` engines.
- **Config Hygiene**: Detects ignored `pnpm.overrides` in submodules (which trigger warnings).
- **Hook Safety**: Scans git hooks (`.husky/`) for `npm` or `npx` usage that conflicts with `pnpm` workspace constraints.
- **Git Module Health**: Validates `.gitmodules` for self-references or recursive definitions (like `n00-cortex` inside `n00-cortex`).

## 2. `git-force-sync.sh` (The Hammer) 🔨
**Concept**: A "Break Glass in Case of Emergency" tool for synchronization.
**Problem**: Sometimes pre-commit/pre-push hooks in submodules fail due to environment issues (e.g., `trunk` permissions) or dirty states, blocking a workspace-wide push.
**Action**:
- Iterates through all active submodules.
- Stages all changes.
- Commits with `--no-verify`.
- Pushes with `--no-verify`.
- Finally syncs the root.
**Use Case**: When you are confident in your changes but blocked by local tooling issues.

## 3. Future Concepts 🔮
- **`fix-submodule-urls.mjs`**: Automatically checks for 404s on submodule remotes and suggests fixes (would have caught the `n00t` issue).
- **`standardize-skel.mjs`**: Enforces a standard file structure (`CHANGELOG.md`, `LICENSE`, `tsconfig.base.json`) across all submodules.
