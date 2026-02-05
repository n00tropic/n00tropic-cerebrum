#!/usr/bin/env bash
set -euo pipefail

# Sync the workspace Node.js version across nvm, toolchain manifest, and Trunk configs.
# Source of truth is ROOT/.nvmrc unless overridden with --version <v>.

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CANONICAL_TRUNK="$ROOT/n00-cortex/data/trunk/base/.trunk/trunk.yaml"
ROOT_TRUNK="$ROOT/.trunk/trunk.yaml"
TOOLCHAIN="$ROOT/n00-cortex/data/toolchain-manifest.json"

VERSION=""
while [[ $# -gt 0 ]]; do
	case "$1" in
	--version)
		VERSION="$2"
		shift 2
		;;
	-h | --help)
		cat <<'USAGE'
Usage: scripts/sync-node-version.sh [--version <semver>]

Reads the desired Node.js version from ROOT/.nvmrc (or --version) and applies it to:
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

if [[ -z $VERSION ]]; then
	if [[ -f "$ROOT/.nvmrc" ]]; then
		VERSION=$(cat "$ROOT/.nvmrc" | tr -d '[:space:]')
	else
		echo "Missing .nvmrc and no --version provided" >&2
		exit 1
	fi
fi

if [[ -z $VERSION ]]; then
	echo "Could not determine Node version" >&2
	exit 1
fi

echo "[sync-node] Using Node $VERSION"

update_nvmrc() {
	local path="$1/.nvmrc"
	printf "%s\n" "$VERSION" >"$path"
}

# Update root and common subrepos
update_nvmrc "$ROOT"
for repo in n00-frontiers n00-cortex n00-horizons n00-school n00plicate n00t n00tropic n00menon; do
	[[ -d "$ROOT/$repo" ]] && update_nvmrc "$ROOT/$repo"
done

update_package_jsons() {
	echo "[sync-node] Updating package.json engines..."

	local py_script
	py_script="$ROOT/.sync_node_script.py"

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
	find "$ROOT" -name "package.json" \
		-not -path "*/node_modules/*" \
		-not -path "*/.venv*/*" \
		-not -path "*/dist/*" \
		-not -path "*/build/*" \
		-not -path "*/.git/*" \
		-not -path "*/.mypy_cache/*" \
		-print0 | xargs -0 python3 "$py_script" "$VERSION"

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
