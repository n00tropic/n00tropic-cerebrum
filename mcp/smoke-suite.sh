#!/usr/bin/env bash
# Lightweight MCP suite smoke tests (no long-running workloads).
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$ROOT}"

if [[ -x "${WORKSPACE_ROOT}/.venv/bin/activate" ]]; then
	# shellcheck source=/dev/null
	source "${WORKSPACE_ROOT}/.venv/bin/activate"
fi

export OTEL_TRACES_EXPORTER="${OTEL_TRACES_EXPORTER:-none}"
export OTEL_METRICS_EXPORTER="${OTEL_METRICS_EXPORTER:-none}"

echo "[smoke] verifying capability shim loadable"
python "${WORKSPACE_ROOT}/mcp/capabilities_server.py" --list | head -n 5

echo "[smoke] mcp-proxy list (parses suite config)"
MCP_PROXY_BIN="mcp-proxy"
if ! command -v mcp-proxy >/dev/null 2>&1; then
	MCP_PROXY_BIN="python -m mcp_proxy.cli"
fi
WORKSPACE_ROOT="$WORKSPACE_ROOT" ${MCP_PROXY_BIN} --config "${WORKSPACE_ROOT}/mcp/mcp-suite.yaml" list

echo "[smoke] docs server page fetch (index) via local import"
python - <<'PY'
import asyncio, importlib.util, os
from pathlib import Path

root = Path(os.environ["WORKSPACE_ROOT"])
server_path = root / "mcp" / "docs_server" / "server.py"
spec = importlib.util.spec_from_file_location("docs_server", server_path)
docs = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(docs)  # type: ignore

async def main():
    page = docs.get_page("index")
    assert "content" in page, "docs.get_page missing content"
    print("[smoke] docs index length:", len(page.get("content", "")))

asyncio.run(main())
PY

echo "[smoke] capability shim sample call (noop: list only)"
python - <<'PY'
import os, sys
from pathlib import Path
root = Path(os.environ["WORKSPACE_ROOT"])
sys.path.insert(0, str(root / "mcp"))
import capabilities_server as cap  # type: ignore

print("[smoke] capabilities count:", len(cap.list_capabilities()))

# Validate entrypoints for MCP-enabled capabilities exist
manifest_path = root / "n00t" / "capabilities" / "manifest.json"
caps = []
import json
data = json.loads(manifest_path.read_text())
for capdef in data.get("capabilities", []):
    agent_cfg = capdef.get("agent", {})
    mcp_cfg = agent_cfg.get("mcp", {}) if isinstance(agent_cfg, dict) else {}
    if not mcp_cfg.get("enabled", False):
        continue
    ep = capdef.get("entrypoint")
    if not ep:
        raise SystemExit(f"[smoke] missing entrypoint for {capdef.get('id')}")
    path = (manifest_path.parent / ep).resolve()
    if not path.exists():
        raise SystemExit(f"[smoke] entrypoint missing: {path}")
    caps.append(capdef.get("id"))

print("[smoke] validated entrypoints:", len(caps))
PY

if [[ ${RUN_CAP_SMOKE:-0} == "1" ]]; then
	echo "[smoke] capability dry-run: deps.drift (format=json, dry-run mode)"
	TRUNK_CHECK_SCOPE=changed \
		"${WORKSPACE_ROOT}/.venv/bin/python" "${WORKSPACE_ROOT}/.dev/automation/scripts/deps-drift.py" --format json >/dev/null
fi

if [[ ${RUN_AI_WORKFLOW_PING:-0} == "1" ]]; then
	echo "[smoke] ai-workflow MCP ping (tool list)"
	WORKSPACE_ROOT="$WORKSPACE_ROOT" mcp-proxy --config "${WORKSPACE_ROOT}/mcp/mcp-suite.yaml" tools | grep -i "ai-workflow" || true
fi

if [[ ${RUN_CORTEX_PING:-0} == "1" ]]; then
	echo "[smoke] cortex-catalog MCP ping (tool list)"
	WORKSPACE_ROOT="$WORKSPACE_ROOT" mcp-proxy --config "${WORKSPACE_ROOT}/mcp/mcp-suite.yaml" tools | grep -i "cortex" || true
fi

echo "[smoke] done"
