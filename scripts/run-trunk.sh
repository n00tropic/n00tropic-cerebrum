#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP_DIR="${ROOT_DIR}/.tmp"
CACHE_DIR="${ROOT_DIR}/.cache_local"

mkdir -p "${TMP_DIR}" "${CACHE_DIR}"

export TMPDIR="${TMP_DIR}"
export XDG_CACHE_HOME="${CACHE_DIR}"

pnpm exec trunk "$@"
