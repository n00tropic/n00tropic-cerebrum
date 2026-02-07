#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MODE=${1:-install}

if [[ ! -f "$ROOT_DIR/package.json" ]]; then
	echo "[pnpm-install-safe] package.json not found at $ROOT_DIR" >&2
	exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
	echo "[pnpm-install-safe] pnpm not found; run scripts/setup-pnpm.sh first" >&2
	exit 1
fi

export PNPM_STORE_DIR=${PNPM_STORE_DIR:-.pnpm-store}
export PNPM_PACKAGE_IMPORT_METHOD=${PNPM_PACKAGE_IMPORT_METHOD:-copy}

DEFAULT_ALLOWLIST="$ROOT_DIR/scripts/preflight-allowlist.txt"
if [[ -z ${PREFLIGHT_ALLOWLIST_FILE-} && -f $DEFAULT_ALLOWLIST ]]; then
	export PREFLIGHT_ALLOWLIST_FILE="$DEFAULT_ALLOWLIST"
fi

if [[ ${SKIP_PNPM_PREFLIGHT:-0} != 1 && -f "$ROOT_DIR/scripts/preflight-pnpm-deps.mjs" ]]; then
	node "$ROOT_DIR/scripts/preflight-pnpm-deps.mjs" || {
		echo "[pnpm-install-safe] preflight failed; set SKIP_PNPM_PREFLIGHT=1 to bypass" >&2
		exit 1
	}
fi

cd "$ROOT_DIR"

case "$MODE" in
install)
	echo "[pnpm-install-safe] installing workspace deps"
	pnpm install
	;;
update)
	echo "[pnpm-install-safe] updating workspace deps"
	pnpm update -r --latest
	;;
*)
	echo "Usage: $0 [install|update]" >&2
	exit 2
	;;
esac
