#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP_DIR="${ROOT_DIR}/.tmp"
CACHE_DIR="${ROOT_DIR}/.cache_local"

shopt -s nullglob

echo "[cleanup-trunk] Removing Trunk temp/cache artifacts under ${TMP_DIR} and ${CACHE_DIR}"

rm -rf "${TMP_DIR}"/trunk-* || true
rm -rf "${CACHE_DIR}"/trunk "${CACHE_DIR}"/trunk-* || true

shopt -u nullglob

echo "[cleanup-trunk] Done."
