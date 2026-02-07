#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEMPLATE_ROOT="$ROOT/platform/n00-frontiers/templates"
OUTPUT_ROOT="$ROOT/resources"
TEMP_ROOT="$ROOT/.tmp/template-sync"
DRY_RUN=0
NO_RENDER=0
CHECK=0
CHANGES=0

TEMPLATES=("frontier-repo" "frontier-webapp")

usage() {
	cat <<'USAGE'
Usage: scripts/sync-frontier-template-exports.sh [options]

Options:
  --template NAME   Limit to a single template (frontier-repo|frontier-webapp)
  --no-render       Skip cookiecutter render; use existing TEMP_ROOT outputs
  --dry-run         Show planned sync actions without writing
	--check           Render and compare; fail if resources would change
  -h, --help        Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--template)
		TEMPLATES=("$2")
		shift 2
		;;
	--no-render)
		NO_RENDER=1
		shift
		;;
	--dry-run)
		DRY_RUN=1
		shift
		;;
	--check)
		CHECK=1
		DRY_RUN=1
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "[sync-templates] Unknown arg: $1" >&2
		usage
		exit 2
		;;
	esac

done

cookiecutter_cmd=""
if command -v cookiecutter >/dev/null 2>&1; then
	cookiecutter_cmd="cookiecutter"
else
	if python3 - <<'PY'; then
import importlib.util
print(1 if importlib.util.find_spec("cookiecutter") else 0)
PY
		cookiecutter_cmd="python3 -m cookiecutter"
	fi
fi

if [[ -z $cookiecutter_cmd && $NO_RENDER -eq 0 ]]; then
	echo "[sync-templates] cookiecutter not found. Install with: pip install cookiecutter" >&2
	exit 1
fi

render_template() {
	local template_name="$1"
	local template_dir="$TEMPLATE_ROOT/$template_name"
	local output_dir="$TEMP_ROOT"

	if [[ ! -d $template_dir ]]; then
		echo "[sync-templates] Missing template directory: $template_dir" >&2
		exit 1
	fi

	local project_slug
	project_slug=$(
		python3 - <<PY
import json, pathlib
path = pathlib.Path("$template_dir") / "cookiecutter.json"
print(json.loads(path.read_text(encoding="utf-8")).get("project_slug", ""))
PY
	)

	if [[ -z $project_slug ]]; then
		echo "[sync-templates] project_slug missing in $template_dir/cookiecutter.json" >&2
		exit 1
	fi

	mkdir -p "$output_dir"
	echo "[sync-templates] Rendering $template_name (slug=$project_slug)" >&2
	$cookiecutter_cmd "$template_dir" --no-input --overwrite-if-exists --output-dir "$output_dir"

	echo "$output_dir/$project_slug"
}

sync_render() {
	local render_dir="$1"
	local dest_dir="$2"

	if [[ ! -d $render_dir ]]; then
		echo "[sync-templates] Render output missing: $render_dir" >&2
		exit 1
	fi
	if [[ ! -d $dest_dir ]]; then
		echo "[sync-templates] Destination missing: $dest_dir" >&2
		exit 1
	fi

	local rsync_flags=("-a" "--delete" "--exclude" ".git" "--exclude" "templates/" "--exclude" "node_modules/" "--exclude" "dist/" "--exclude" ".venv/" "--exclude" ".cache/")
	if [[ $DRY_RUN -eq 1 ]]; then
		rsync_flags+=("--dry-run" "--itemize-changes")
	fi

	echo "[sync-templates] Syncing $render_dir -> $dest_dir"
	if [[ $DRY_RUN -eq 1 ]]; then
		local output
		output=$(rsync "${rsync_flags[@]}" "$render_dir/" "$dest_dir/" || true)
		if [[ -n $output ]]; then
			CHANGES=1
			echo "$output"
		fi
	else
		rsync "${rsync_flags[@]}" "$render_dir/" "$dest_dir/"
	fi
}

for template in "${TEMPLATES[@]}"; do
	case "$template" in
	frontier-repo)
		dest="$OUTPUT_ROOT/frontier-repo-template"
		;;
	frontier-webapp)
		dest="$OUTPUT_ROOT/frontier-webapp-template"
		;;
	*)
		echo "[sync-templates] Unknown template: $template" >&2
		exit 2
		;;
	esac

	if [[ $NO_RENDER -eq 0 ]]; then
		render_dir=$(render_template "$template")
	else
		render_dir="$TEMP_ROOT"
	fi

	sync_render "$render_dir" "$dest"

	echo "[sync-templates] Updated $dest"

done

if [[ $CHECK -eq 1 && $CHANGES -ne 0 ]]; then
	echo "[sync-templates] Drift detected in resources exports." >&2
	exit 1
fi
