#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

MODE=install
RUN_TOOLCHAIN=1
RUN_SYNC=1
RUN_INSTALL=1
RUN_QA=1
QA_FLAGS=()

usage() {
	cat <<'USAGE'
Usage: scripts/local-preflight.sh [options]

Options:
  install|update         Install or update dependencies (default: install)
  --skip-toolchain       Skip toolchain pin checks
  --skip-sync            Skip tools:sync-all
  --skip-install         Skip install/update step
  --skip-qa              Skip workspace QA
  --qa-with-trunk         Run QA with Trunk sweep
  --qa-full              Run QA with --full (auto-fix + trunk fmt)
  -h, --help             Show this help

Examples:
  scripts/local-preflight.sh
  scripts/local-preflight.sh update --qa-with-trunk
  scripts/local-preflight.sh --skip-install --skip-qa
USAGE
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	install | update)
		MODE="$1"
		shift
		;;
	--skip-toolchain)
		RUN_TOOLCHAIN=0
		shift
		;;
	--skip-sync)
		RUN_SYNC=0
		shift
		;;
	--skip-install)
		RUN_INSTALL=0
		shift
		;;
	--skip-qa)
		RUN_QA=0
		shift
		;;
	--qa-with-trunk)
		QA_FLAGS+=("--with-trunk")
		shift
		;;
	--qa-full)
		QA_FLAGS+=("--full")
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "[local-preflight] Unknown arg: $1" >&2
		usage
		exit 2
		;;
	esac

done

cd "$ROOT_DIR"

if [[ $RUN_TOOLCHAIN -eq 1 ]]; then
	echo "[local-preflight] Checking toolchain pins"
	node scripts/check-toolchain-pins.mjs
fi

if [[ $RUN_SYNC -eq 1 ]]; then
	echo "[local-preflight] Syncing ecosystem"
	pnpm run tools:sync-all
fi

if [[ $RUN_INSTALL -eq 1 ]]; then
	echo "[local-preflight] Running install-workspace (${MODE})"
	bash scripts/install-workspace.sh "${MODE}"
fi

if [[ $RUN_QA -eq 1 ]]; then
	echo "[local-preflight] Running workspace QA"
	bash scripts/workspace-qa.sh "${QA_FLAGS[@]}"
fi
