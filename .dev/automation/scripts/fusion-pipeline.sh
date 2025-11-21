#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
FUSION_DIR="${ROOT_DIR}/n00clear-fusion"
CORTEX_DIR="${ROOT_DIR}/n00-cortex"

if [[ $# -lt 1 ]]; then
  echo "Usage: fusion-pipeline.sh <pdf-path|dir> [dataset-id]" >&2
  exit 1
fi

INPUT_PATH="$1"
DATASET_ID="${2:-}"

export PYTHONPATH="${FUSION_DIR}"
source "${FUSION_DIR}/.venv/bin/activate" 2>/dev/null || true

process_one() {
	local pdf="$1"
	local ds="$2"
	local processed_dir="${FUSION_DIR}/corpora/Processed"
	mkdir -p "${processed_dir}"

	echo "[fusion] ingest ${pdf}"
	python3 "${FUSION_DIR}/pipelines/pdf_ingest.py" --source "${pdf}" ${ds:+--id "${ds}"}

	if [[ -z "${ds}" ]]; then
		ds=$(basename "${pdf}")
		ds="${ds%.*}"
		ds=$(echo "${ds}" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
	fi

	echo "[fusion] embed ${ds}"
	python3 "${FUSION_DIR}/pipelines/embed_chunks.py" --dataset "${ds}" --backend auto

	echo "[fusion] generate assets ${ds}"
	python3 "${FUSION_DIR}/cli.py" generate --dataset "${ds}"

	mv "${pdf}" "${processed_dir}/" || true
}

if [[ -d "${INPUT_PATH}" ]]; then
	for pdf in "${INPUT_PATH}"/*.pdf; do
		[[ -f "$pdf" ]] || continue
		process_one "$pdf" "$DATASET_ID"
	done
else
	process_one "${INPUT_PATH}" "${DATASET_ID}"
fi

echo "[fusion] rebuild graph"
node "${CORTEX_DIR}/scripts/build-graph.mjs"

echo "[fusion] pipeline complete"
