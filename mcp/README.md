# Master MCP Suite (agents, Copilot, Codex)

This directory centralises all MCP endpoints we expect agents to use:

- `docs` — n00 Docs MCP server (read-only docs/search).
- `filesystem` — stdio server for file access scoped to the workspace.
- `memory` — key/value memory server.
- `n00t-capabilities` — MCP shim that wraps the n00t capability manifest into callable tools.
- Optional: `github`, `search` (Brave).
- Routing profile: `mcp/routing-profile.yaml` provides pattern→server mapping for CapabilityRouter (e.g., docs._ → docs, deps._ → n00t-capabilities).
- Additional servers wired in suite:
  - `ai-workflow` (.dev/automation/mcp-server/index.js)
  - `cortex-catalog` (n00-cortex/mcp-server/index.js)
  - `cortex-graph` (HTTP at http://localhost:8787/mcp)

## Quick start

```bash
cd /path/to/n00tropic-cerebrum
# Start suite (docs + capability shim + proxy)
./mcp/start-suite.sh

# Health check (list servers; optional tools with RUN_TOOLS=1)
WORKSPACE_ROOT=$(pwd) ./mcp/health-suite.sh
# RUN_TOOLS=1 WORKSPACE_ROOT=$(pwd) ./mcp/health-suite.sh

# Quick smoke (parses config, lists capabilities, exercises docs.get_page)
WORKSPACE_ROOT=$(pwd) ./mcp/smoke-suite.sh
```

## VS Code / Copilot (Agent Mode)

Point VS Code to the master suite with a single config file:

`mcp/vscode.mcp.json` (copy/symlink to `.vscode/mcp.json`):

```jsonc
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}",
      ],
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
    },
    "docs": {
      "command": "python",
      "args": ["${workspaceFolder}/mcp/docs_server/server.py"],
    },
    "n00t-capabilities": {
      "command": "python",
      "args": ["${workspaceFolder}/mcp/capabilities_server.py"],
    },
    // Optional (uncomment with tokens set):
    // "github": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-github"],
    //   "env": { "GITHUB_TOKEN": "${env:GITHUB_TOKEN}" }
    // },
    // "search": {
    //   "command": "npx",
    //   "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    //   "env": { "BRAVE_API_KEY": "${env:BRAVE_API_KEY}" }
    // }
  },
}
```

After saving, open Copilot Chat → Agent → Tools (🔧) → Start to launch the servers.

## mcp-proxy federation

- Config file: `mcp/mcp-suite.yaml`
- Health/list tools: `mcp/health-suite.sh` (wraps `mcp-proxy list/tools`)
- Smoke tests: `mcp/smoke-suite.sh`
- Suite launcher: `mcp/start-suite.sh`
- CI sanity: `mcp/ci-sanity.sh` (health with tool listing + smoke)
- Routing sample: `mcp/router-shim.py` prints resolved servers using `routing-profile.yaml`
- External servers: see `mcp/external-servers.example.json` for common third-party MCP servers (Asana, Azure DevOps, Context7, Playwright/Chrome DevTools, Logfire, SonarQube, Tavily, fetch/git). Copy entries as needed and inject tokens via env vars—never hardcode secrets in repo configs.

## Status

- Docs MCP: ready (make `mcp-dev` or run directly).
- Filesystem & Memory: ready (npm @modelcontextprotocol servers).
- GitHub / Brave: optional, off by default.
- n00t capabilities: placeholder only; hook in once the shim lands.
