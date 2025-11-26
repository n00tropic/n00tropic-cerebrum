#!/usr/bin/env bash
# Fetch syft into ./bin if missing. Kept out of git via .gitignore.
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${ROOT_DIR}/bin"
mkdir -p "${BIN_DIR}"

if command -v syft >/dev/null 2>&1; then
	echo "syft already in PATH: $(command -v syft)"
	exit 0
fi

if [[ -x "${BIN_DIR}/syft" ]]; then
	echo "syft already present at ${BIN_DIR}/syft"
	exit 0
fi

echo "Installing syft to ${BIN_DIR}..."
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b "${BIN_DIR}"
echo "syft installed at ${BIN_DIR}/syft"
