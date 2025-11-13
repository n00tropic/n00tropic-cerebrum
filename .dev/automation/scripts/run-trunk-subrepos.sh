#!/usr/bin/env bash
set -euo pipefail
DIR=$(cd "$(dirname "$0")/../../.." && pwd)
TRUNK_BIN="${TRUNK_BIN:-$HOME/.trunk/bin/trunk}"
echo "Using trunk binary at: $TRUNK_BIN"
export VALE_LOCAL=1
export VALE_CONFIG="$DIR/.vale.local.ini"
echo "VALE_CONFIG=$VALE_CONFIG"
cd "$DIR"

REPOS=(
  "n00-cortex"
  "n00-frontiers"
  "n00t"
  "n00plicate"
  "n00-dashboard"
  "n00-school"
)

ARTIFACTS_DIR="artifacts/trunk-results"
mkdir -p "$ARTIFACTS_DIR"

FAILED=0
for repo in "${REPOS[@]}"; do
  if [ -d "$repo" ]; then
    echo "\n== Running trunk check in $repo =="
    pushd "$repo" >/dev/null
    # Ensure subrepo trunk config exists
      if [ -d ".trunk" ]; then
      echo "Using local .trunk/trunk.yaml for $repo"
      "$TRUNK_BIN" check --no-spinner --json > "$DIR/$ARTIFACTS_DIR/$repo.json" || FAILED=1
    else
      echo "No .trunk found in $repo; running trunk check with default settings"
  "$TRUNK_BIN" check --no-spinner --json > "$DIR/$ARTIFACTS_DIR/$repo.json" || FAILED=1
    fi
    popd >/dev/null
  else
    echo "Skipping $repo (directory not present)"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo "One or more trunk checks failed"
  exit 1
fi

echo "All trunk checks passed"
exit 0
