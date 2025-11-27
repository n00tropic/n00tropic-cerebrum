#!/usr/bin/env bash
# Start the full MCP suite: docs server + capability shim + mcp-proxy serve.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$ROOT}"
ARTIFACTS="${WORKSPACE_ROOT}/artifacts/mcp"
mkdir -p "$ARTIFACTS"

# Prefer repo venv if present
if [[ -x "${WORKSPACE_ROOT}/.venv/bin/activate" ]]; then
	# shellcheck source=/dev/null
	source "${WORKSPACE_ROOT}/.venv/bin/activate"
fi

# Default tracing to noop unless explicitly set
export OTEL_TRACES_EXPORTER="${OTEL_TRACES_EXPORTER:-none}"
export OTEL_METRICS_EXPORTER="${OTEL_METRICS_EXPORTER:-none}"

log() {
	printf '[mcp-suite] %s\n' "$*"
}

ensure_mcp_proxy() {
	if command -v mcp-proxy >/dev/null 2>&1; then
		echo "mcp-proxy"
		return 0
	fi
	if python - <<'PY' >/dev/null 2>&1; then
import importlib.util, sys
sys.exit(0 if importlib.util.find_spec("mcp_proxy") else 1)
PY
		echo "python -m mcp_proxy.cli"
		return 0
	fi
	log "mcp-proxy not installed. Install with: pip install -e n00t/packages/mcp-proxy or pip install mcp-proxy"
	exit 1
}

start_bg() {
	local name="$1"
	shift
	local log_file="${ARTIFACTS}/${name}.log"
	log "starting ${name} -> ${log_file}"
	("$@") >"$log_file" 2>&1 &
	echo $! >"${ARTIFACTS}/${name}.pid"
}

# Start docs + capabilities shim in background
start_bg docs python "${WORKSPACE_ROOT}/mcp/docs_server/server.py"
start_bg capabilities python "${WORKSPACE_ROOT}/mcp/capabilities_server.py"

# Start proxy in foreground (use exec to forward signals)
MCP_PROXY_BIN=$(ensure_mcp_proxy)
PORT="${MCP_PROXY_PORT:-8080}"
log "starting mcp-proxy on port ${PORT}"
exec ${MCP_PROXY_BIN} serve --config "${WORKSPACE_ROOT}/mcp/mcp-suite.yaml" --port "${PORT}"
