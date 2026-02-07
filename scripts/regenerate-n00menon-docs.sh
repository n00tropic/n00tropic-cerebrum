#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
N00MENON_DIR="${ROOT_DIR}/platform/n00menon"
TYPEDOC_OPTIONS="${N00MENON_DIR}/typedoc.json"

if [[ ! -f ${TYPEDOC_OPTIONS} ]]; then
	echo "[n00menon-docs] Missing typedoc.json at ${TYPEDOC_OPTIONS}" >&2
	exit 1
fi

if [[ ! -x "${ROOT_DIR}/node_modules/.bin/typedoc" && ! -x "${N00MENON_DIR}/node_modules/.bin/typedoc" ]]; then
	if [[ -x "${ROOT_DIR}/scripts/pnpm-install-safe.sh" ]]; then
		echo "[n00menon-docs] typedoc missing; installing workspace deps"
		ALLOW_SUBREPO_PNPM_INSTALL=1 "${ROOT_DIR}/scripts/pnpm-install-safe.sh" install
	else
		echo "[n00menon-docs] typedoc missing and pnpm-install-safe.sh not found" >&2
		exit 1
	fi
fi

node "${ROOT_DIR}/scripts/run-typedoc.mjs" --options "${TYPEDOC_OPTIONS}"
