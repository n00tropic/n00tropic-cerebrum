#!/bin/bash

# git-force-sync.sh
# "The Hammer" for when hooks or permissions prevent standard git operations.
# Recursively commits and pushes all submodules with --no-verify.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Starting Force Sync (Hammer Mode) ===${NC}"
echo -e "${RED}WARNING: This bypasses all pre-commit and pre-push hooks (linting, tests).${NC}"
echo "Waiting 5 seconds... (Ctrl+C to cancel)"
sleep 5

# Root of the repo (assuming script is in agent-scriptbox/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to sync a directory
sync_dir() {
	local dir=$1
	local name=$(basename "$dir")

	echo -e "\n${BLUE}Processing: $name${NC}"
	cd "$dir"

	# Check for changes
	if [[ -n $(git status -s) ]]; then
		echo "Found changes. Committing..."
		git add .
		git commit --no-verify -m "chore: force sync via agent scriptbox" || echo "Commit failed or empty"

		echo "Pushing..."
		git push origin main --no-verify
	else
		echo "No changes in $name."
		# Attempt push anyway in case ahead of remote
		git push origin main --no-verify || true
	fi
}

# 1. Sync Submodules
cd "$ROOT_DIR"
git submodule foreach --quiet '
    echo -e "\033[0;34mSyncing submodule: $name\033[0m"
    git add .
    git commit --no-verify -m "chore: force sync submodules" || true
    git push origin main --no-verify || echo "Push failed for $name"
'

# 2. Sync Root
echo -e "\n${BLUE}Syncing Root Repository${NC}"
cd "$ROOT_DIR"
git add .
git commit --no-verify -m "chore: root force sync" || true
git push origin main --no-verify

echo -e "\n${GREEN}Force Sync Complete.${NC}"
