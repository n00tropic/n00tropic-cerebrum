#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../../.." && pwd)

LOG_DIR="${ROOT_DIR}/.dev/automation/artifacts/meta-check"
LOG_PATH="${LOG_DIR}/latest.log"
mkdir -p "$LOG_DIR"

record_envelope() {
	local status="$1"
	local notes="$2"
	python3 "$SCRIPT_DIR/record-run-envelope.py" \
		--capability workspace.metaCheck \
		--status "$status" \
		--asset "$(realpath --relative-to="$ROOT_DIR" "$LOG_PATH")" \
		--notes "$notes" || true
}

finish() {
	local rc=$?
	if [[ $rc -eq 0 ]]; then
		record_envelope "success" "meta-check succeeded"
	else
		record_envelope "failure" "meta-check failed rc=$rc"
	fi
}
trap finish EXIT

echo "[meta-check] starting at $(date --iso-8601=seconds)" | tee "$LOG_PATH"

if ! command -v pnpm >/dev/null 2>&1; then
	echo "[meta-check] pnpm not found; please install pnpm or enable corepack" | tee -a "$LOG_PATH"
	exit 1
fi

echo "[meta-check] validating cortex schemas..." | tee -a "$LOG_PATH"
pnpm -C "$ROOT_DIR/n00-cortex" validate:schemas | tee -a "$LOG_PATH"

echo "[meta-check] done." | tee -a "$LOG_PATH"
