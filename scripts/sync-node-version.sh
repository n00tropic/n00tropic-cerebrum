#!/usr/bin/env bash
set -euo pipefail

# Sync the workspace Node.js version across nvm, toolchain manifest, and Trunk configs.
# Source of truth is ROOT/.nvmrc unless overridden with --version <v> or --from-system.

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CANONICAL_TRUNK="$ROOT/platform/n00-cortex/data/trunk/base/.trunk/trunk.yaml"
ROOT_TRUNK="$ROOT/.trunk/trunk.yaml"
TOOLCHAIN="$ROOT/platform/n00-cortex/data/toolchain-manifest.json"

VERSION=""
USE_SYSTEM=0
while [[ $# -gt 0 ]]; do
	case "$1" in
	--version)
		VERSION="$2"
		shift 2
		;;
	--from-system)
		USE_SYSTEM=1
		shift 1
		;;
	-h | --help)
		cat <<'USAGE'
Usage: scripts/sync-node-version.sh [--version <semver>] [--from-system]

Reads the desired Node.js version from ROOT/.nvmrc, --version, or the active system Node
when using --from-system, and applies it to:
  - ROOT/.nvmrc and subrepo .nvmrc files
  - n00-cortex/data/toolchain-manifest.json (toolchains.node + repo pins)
  - Canonical Trunk configs (node runtime + definition)
Then fans the Trunk config to subrepos via sync-trunk.py --pull.
USAGE
		exit 0
		;;
	*)
		echo "Unknown arg: $1" >&2
		exit 2
		;;
	esac
done

if [[ $USE_SYSTEM -eq 1 && -n $VERSION ]]; then
	echo "Use either --version or --from-system, not both." >&2
	exit 2
fi

if [[ $USE_SYSTEM -eq 1 ]]; then
	if ! command -v node >/dev/null 2>&1; then
		echo "node is required for --from-system" >&2
		exit 1
	fi
	VERSION=$(node --version)
fi

if [[ -z $VERSION ]]; then
	if [[ -f "$ROOT/.nvmrc" ]]; then
		VERSION=$(cat "$ROOT/.nvmrc" | tr -d '[:space:]')
	else
		echo "Missing .nvmrc and no --version provided" >&2
		exit 1
	fi
fi

VERSION=${VERSION#v}

if [[ -z $VERSION ]]; then
	echo "Could not determine Node version" >&2
	exit 1
fi

if ! [[ ${VERSION} =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.]+)?$ ]]; then
	echo "Invalid Node version: ${VERSION}" >&2
	exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
	echo "python3 is required for manifest updates" >&2
	exit 1
fi

echo "[sync-node] Using Node $VERSION"

update_nvmrc() {
	local path="$1/.nvmrc"
	printf "%s\n" "$VERSION" >"$path"
}

# Update root and common subrepos

# Update root and all platform subrepos
update_nvmrc "$ROOT"
for repo_dir in "${ROOT}/platform"/*; do
	if [[ -d $repo_dir && -f "${repo_dir}/package.json" ]]; then
		update_nvmrc "$repo_dir"
	fi
done

update_package_jsons() {
	echo "[sync-node] Updating package.json engines..."

	local py_script
	py_script=$(mktemp -t sync-node-script.XXXXXX.py)

	cat >"$py_script" <<'PY'
import sys
import json
import os

target_version = f">={sys.argv[1]}"

def detect_indent(content):
    for line in content.splitlines():
        if line.startswith('\t'): return '\t'
        if line.startswith('  '): return '  ' # simplistic, usually 2 or 4 spaces
    return '\t' # default

for file_path in sys.argv[2:]:
    # print(f"Processing {file_path}", file=sys.stderr)
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            data = json.loads(content)

        changed = False

        # Update engines.node
        if "engines" not in data:
            data["engines"] = {}

        current_engine = data["engines"].get("node")
        if current_engine != target_version:
            data["engines"]["node"] = target_version
            changed = True

        if changed:
            indent = detect_indent(content)
            print(f"Updating {file_path}...")
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=indent)
                f.write("\n")
    except Exception as e:
        print(f"Skipping {file_path}: {e}", file=sys.stderr)
PY

	# Find all package.json files, excluding node_modules, ignored dirs
	local package_files=()
	while IFS= read -r -d '' file; do
		package_files+=("${file}")
	done < <(
		find "$ROOT" -name "package.json" \
			-not -path "*/node_modules/*" \
			-not -path "*/.uv-cache/*" \
			-not -path "*/.uv/*" \
			-not -path "*/.cache_local/*" \
			-not -path "*/.next/*" \
			-not -path "*/.turbo/*" \
			-not -path "*/.pnpm-store/*" \
			-not -path "*/.venv*/*" \
			-not -path "*/dist/*" \
			-not -path "*/build/*" \
			-not -path "*/artifacts/*" \
			-not -path "*/.tmp/*" \
			-not -path "*/tmp/*" \
			-not -path "*/.git/*" \
			-not -path "*/.mypy_cache/*" \
			-print0
	)

	if [[ ${#package_files[@]} -eq 0 ]]; then
		echo "[sync-node] No package.json files found; skipping engines update."
		return 0
	fi

	python3 "$py_script" "${VERSION}" "${package_files[@]}"
	rm -f "$py_script"
}

update_package_jsons

# Update toolchain manifest
python3 - "$TOOLCHAIN" "$VERSION" <<'PY'
import json, sys
path, version = sys.argv[1], sys.argv[2]
data = json.loads(open(path).read())
data.setdefault("toolchains", {}).setdefault("node", {})["version"] = version
for repo in data.get("repos", {}).values():
    if isinstance(repo, dict) and "node" in repo:
        repo["node"] = version
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"[sync-node] Updated toolchain manifest → {path}")
PY

replace_node_version_yaml() {
	local file="$1"
	[[ -f $file ]] || return 0
	python3 - "$file" "$VERSION" <<'PY'
import re, sys
path, version = sys.argv[1], sys.argv[2]
text = open(path).read()
text_new = re.sub(r"node@\d+(?:\.\d+)*", f"node@{version}", text)
text_new = re.sub(r"(type: node\s*\n\s*system_version: allowed\s*\n\s*version: )\d+(?:\.\d+)*", rf"\g<1>{version}", text_new)
if text != text_new:
    open(path, "w").write(text_new)
    print(f"[sync-node] Updated {path}")
PY
}

replace_node_version_yaml "$CANONICAL_TRUNK"
replace_node_version_yaml "$ROOT_TRUNK"

# Fan out trunk configs
if [[ -x "$ROOT/.dev/automation/scripts/sync-trunk.py" ]]; then
	(cd "$ROOT" && .dev/automation/scripts/sync-trunk.py --pull)
fi

echo "[sync-node] Done. Consider rerunning meta-check or workspace QA."
