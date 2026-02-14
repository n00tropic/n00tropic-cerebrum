# Directory Layout Standardization Guide

This document defines the standardized directory layouts for all subprojects in the n00tropic-cerebrum ecosystem.

## Overview

| Project Type    | Layout Pattern    | Example Projects                    |
| --------------- | ----------------- | ----------------------------------- |
| Python Package  | `src/` layout     | n00man, n00-school, n00clear-fusion |
| TypeScript/Node | Monorepo/Standard | n00-cortex, n00t, n00-frontiers     |
| Swift/iOS       | Xcode Standard    | n00HQ, n00-dashboard                |
| Documentation   | Antora Standard   | n00menon                            |

## Python Projects (`src/` Layout)

### Standard Structure

```
project-name/
├── .github/              # GitHub workflows, templates
├── docs/                 # Documentation (Antora or MkDocs)
│   └── modules/
├── src/                  # Source code (REQUIRED - src layout)
│   └── package_name/     # Actual package code
│       ├── __init__.py
│       ├── core/
│       └── cli/
├── tests/                # Test files
│   ├── __init__.py
│   ├── unit/
│   └── integration/
├── .env.example          # Environment template
├── .gitignore
├── AGENTS.md             # Agent guide
├── CONTRIBUTING.md       # Contribution guide
├── LICENSE
├── pyproject.toml        # Python project config
├── README.md
└── requirements.txt      # Legacy (migrate to pyproject.toml)
```

### Required Files

- `pyproject.toml` - Project metadata, dependencies, tool configs
- `AGENTS.md` - Agent-facing documentation
- `src/<package>/__init__.py` - Package marker
- `tests/` - Test directory

### Prohibited Patterns

- ❌ Flat layout (code at root level)
- ❌ `setup.py` (use pyproject.toml)
- ❌ `requirements.txt` (migrate to pyproject.toml dependencies)
- ❌ `setup.cfg` (consolidate into pyproject.toml)

## TypeScript/Node Projects

### Monorepo Structure (n00t, n00-cortex)

```
project-name/
├── .github/
├── apps/                 # Applications
│   └── web/
├── docs/                 # Documentation
├── packages/             # Shared packages
│   └── core/
├── scripts/              # Build/dev scripts
├── tests/                # E2E/integration tests
├── .env.example
├── .gitignore
├── AGENTS.md
├── biome.json           # Lint config (extends base)
├── package.json
├── pnpm-workspace.yaml  # Workspace definition
├── README.md
├── tsconfig.json        # Extends base config
└── vitest.config.ts     # Test config
```

### Standard Structure (n00-frontiers, n00menon)

```
project-name/
├── .github/
├── src/                  # Source code
│   ├── index.ts
│   └── lib/
├── tests/
├── docs/
├── scripts/
├── .env.example
├── .gitignore
├── AGENTS.md
├── biome.json
├── package.json
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

### Required Configurations

All TypeScript projects MUST:

1. Extend base configs from n00-cortex:
   - `tsconfig.json` → `extends: "../n00-cortex/data/toolchain-configs/tsconfig-base.json"`
   - `biome.json` → `extends: "../n00-cortex/data/toolchain-configs/biome-base.json"`

2. Use consistent scripts in package.json:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "test": "vitest",
       "lint": "biome check .",
       "lint:fix": "biome check . --write",
       "format": "biome format . --write"
     }
   }
   ```

## Swift/iOS Projects

### Standard Structure

```
project-name/
├── .github/
├── Sources/              # Swift source files
│   └── ProjectName/
├── Tests/                # Swift tests
│   └── ProjectNameTests/
├── docs/
├── Resources/            # Assets, data files
├── AGENTS.md
├── Package.swift         # Swift Package Manager
├── README.md
└── .gitignore
```

## Configuration File Locations

### CI/CD (All Projects)

```
.github/
├── workflows/            # GitHub Actions workflows
│   └── *.yml            # Follow naming convention
├── ISSUE_TEMPLATE/       # Issue templates
├── PULL_REQUEST_TEMPLATE.md
└── CODEOWNERS
```

### Development Tools

| File              | Location | Notes                                 |
| ----------------- | -------- | ------------------------------------- |
| `.nvmrc`          | Root     | Symlink to `../.nvmrc` in subprojects |
| `.python-version` | Root     | Symlink to `../.python-version`       |
| `.env.example`    | Root     | Template for environment variables    |
| `.gitignore`      | Root     | Standard git ignore patterns          |
| `.trunk/`         | Root     | Trunk linting config (if used)        |

### Documentation

| Type         | Location             | Standard             |
| ------------ | -------------------- | -------------------- |
| Agent docs   | `AGENTS.md`          | Root level, required |
| API docs     | `docs/api/`          | Generated from code  |
| Architecture | `docs/architecture/` | ADRs, diagrams       |
| User guides  | `docs/modules/`      | Antora structure     |

## Migration Checklist

When standardizing a project:

- [ ] Move source to `src/` (Python) or verify `src/` structure (TypeScript)
- [ ] Consolidate tool configs into pyproject.toml (Python) or package.json (TypeScript)
- [ ] Ensure AGENTS.md follows schema and is at root
- [ ] Verify .github/ contains required workflows
- [ ] Add/extend base configs from n00-cortex
- [ ] Update README.md with standard sections
- [ ] Run validation scripts to verify

## Validation

Use these scripts to check compliance:

```bash
# Check directory structure
node scripts/check-directory-layout.mjs

# Full validation
bash .dev/automation/scripts/meta-check.sh
```
