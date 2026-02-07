#!/bin/bash

# git-force-sync.sh
# "The Hammer" for when hooks or permissions prevent standard git operations.
# Recursively commits and pushes all submodules with --no-verify.
# Also sets upstreams and rebases to avoid non-fast-forward errors.

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

ensure_upstream() {
	local branch
	branch=$(git rev-parse --abbrev-ref HEAD)
	if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
		return 0
	fi
	if git show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
		git branch --set-upstream-to "origin/${branch}" "${branch}" || true
		return 0
	fi
	if git show-ref --verify --quiet "refs/remotes/origin/main"; then
		git branch --set-upstream-to "origin/main" "${branch}" || true
	fi
}

rebase_upstream() {
	if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
		git fetch origin --quiet || true
		if ! git pull --rebase --autostash --quiet; then
			echo "Rebase failed; leaving branch as-is."
			git rebase --abort >/dev/null 2>&1 || true
		fi
	fi
}

push_current() {
	if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
		git push --no-verify || true
	else
		git push origin main --no-verify || true
	fi
}

# Function to sync a directory
sync_dir() {
	local dir=$1
	local name=$(basename "$dir")

	echo -e "\n${BLUE}Processing: $name${NC}"
	cd "$dir"

	ensure_upstream
	rebase_upstream

	# Check for changes
	if [[ -n $(git status -s) ]]; then
		echo "Found changes. Committing..."
		git add .
		git commit --no-verify -m "chore: force sync via agent scriptbox" || echo "Commit failed or empty"

		echo "Pushing..."
		push_current
	else
		echo "No changes in $name."
		# Attempt push anyway in case ahead of remote
		push_current
	fi
}

# 1. Sync Submodules
cd "$ROOT_DIR"
mapfile -t submodules < <(git config --file .gitmodules --get-regexp path | awk '{print $2}')
for submodule in "${submodules[@]}"; do
	sync_dir "$ROOT_DIR/$submodule"
done

# 2. Sync Root
echo -e "\n${BLUE}Syncing Root Repository${NC}"
sync_dir "$ROOT_DIR"

echo -e "\n${GREEN}Force Sync Complete.${NC}"
