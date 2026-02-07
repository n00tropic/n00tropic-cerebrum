#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MODE=install

while [[ $# -gt 0 ]]; do
	case "$1" in
	install | update)
		MODE="$1"
		shift
		;;
	--no-preflight)
		export SKIP_PNPM_PREFLIGHT=1
		shift
		;;
	--allowlist)
		export PREFLIGHT_ALLOWLIST="$2"
		shift 2
		;;
	--allowlist-file)
		export PREFLIGHT_ALLOWLIST_FILE="$2"
		shift 2
		;;
	--skip-scoped)
		export PREFLIGHT_SKIP_SCOPED=1
		shift
		;;
	--skip-scopes)
		export PREFLIGHT_SKIP_SCOPES="$2"
		shift 2
		;;
	-h | --help)
		echo "Usage: $0 [install|update] [--no-preflight] [--allowlist a,b] [--allowlist-file path] [--skip-scoped] [--skip-scopes a,b]"
		exit 0
		;;
	*)
		echo "Unknown arg: $1" >&2
		exit 2
		;;
	esac
done

if [[ ! -f "${ROOT_DIR}/package.json" ]]; then
	echo "[install-workspace] package.json not found at ${ROOT_DIR}" >&2
	exit 1
fi

if [[ -x "${ROOT_DIR}/scripts/pnpm-install-safe.sh" ]]; then
	ALLOW_SUBREPO_PNPM_INSTALL=1 "${ROOT_DIR}/scripts/pnpm-install-safe.sh" "${MODE}"
	if [[ ${MODE} == "install" ]]; then
		echo "[install-workspace] install complete"
	fi
	if [[ ${MODE} == "update" ]]; then
		echo "[install-workspace] update complete"
	fi
	exit 0
fi

echo "[install-workspace] pnpm-install-safe.sh missing; falling back to pnpm" >&2
cd "${ROOT_DIR}"

case "${MODE}" in
install)
	pnpm install
	;;
update)
	pnpm update -r --latest
	;;
*)
	echo "Usage: $0 [install|update]" >&2
	exit 2
	;;
esac
