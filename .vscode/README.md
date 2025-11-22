# VS Code workspace visibility

This workspace has been configured so the Explorer reflects the actual files on disk, including files normally hidden by `.gitignore`.

Key settings:

- `explorer.excludeGitIgnore: false` — show files normally hidden by `.gitignore`.
- `search.useIgnoreFiles: false` — include all files in Search results regardless of `.gitignore`.
- `files.exclude` minimal: only `**/.git` is kept hidden by default.
- `files.watcherExclude` excludes `node_modules` and virtual envs from filesystem watchers to avoid performance issues while keeping them visible in Explorer.

If you prefer to hide commonly large folders (like `node_modules`) in the Explorer but still reflect the rest of the filesystem, open `.vscode/n00tropic-cerebrum.code-workspace` and turn on the patterns in `files.exclude` by setting them to `true`.

To revert to the typical VS Code defaults:

1. Set `explorer.excludeGitIgnore: true` to hide files from `.gitignore`.
2. Add a `**/node_modules` `**/.venv-*` pattern in `files.exclude`.

If you want me to change the visibility rules later (e.g., hide `node_modules` in Explorer but still show venvs or a custom list), let me know and I’ll update the workspace settings accordingly.
