#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
MANIFEST="${ROOT_DIR}/platform/n00-cortex/data/toolchain-manifest.json"
PY_VERSION_FILE="$ROOT_DIR/.python-version"

if [[ ! -f $MANIFEST ]]; then
	echo "Manifest missing at $MANIFEST" >&2
	exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
	echo "python3 is required to read the toolchain manifest" >&2
	exit 1
fi

# Extract python version from manifest
VERSION=$(
	python3 - "${MANIFEST}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
val = data.get("toolchains", {}).get("python", {})
print(val if isinstance(val, str) else val.get("version", ""))
PY
)

VERSION=${VERSION#v}

if [[ -z ${VERSION} ]]; then
	echo "Could not find python version in manifest" >&2
	exit 1
fi

if ! [[ ${VERSION} =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.]+)?$ ]]; then
	echo "Invalid Python version: ${VERSION}" >&2
	exit 1
fi

echo "[sync-python] Using Python ${VERSION}"
echo "${VERSION}" >"${PY_VERSION_FILE}"
# Sync logic:
# 1. If .python-version is missing, link to root.
# 2. If it's a symlink, ensure it points to root (update).
# 3. If it's a regular file, respect it as a manual pin (surgical override).

for dir in "${ROOT_DIR}/platform"/*; do
	if [[ -d ${dir} && (-f "${dir}/pyproject.toml" || -f "${dir}/.python-version") ]]; then
		target="$dir/.python-version"

		# If target is missing, or is a symlink
		if [[ ! -e $target || -L $target ]]; then
			ln -sfn ../../.python-version "$target"
			echo "[sync-python] linked $target -> ../../.python-version"
		else
			# It exists and is not a symlink (or is a hardlink/file)
			echo "[sync-python] skipping ${target} (pinned locally)"
		fi
	fi
done
