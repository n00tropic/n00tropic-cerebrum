#!/bin/bash
set -e

# setup-workspace.sh
# Unified bootstrap for the n00tropic-cerebrum ecosystem.

log() {
	echo -e "\033[1;34m[setup]\033[0m $1"
}

check_cmd() {
	if ! command -v "$1" &>/dev/null; then
		echo -e "\033[1;31m[error]\033[0m Required command '$1' not found."
		exit 1
	fi
}

log "Checking prerequisites..."
check_cmd "git"
check_cmd "python3"
check_cmd "node"

# 1. Corepack & PNPM
if ! command -v pnpm &>/dev/null; then
	log "Enabling corepack for pnpm..."
	corepack enable
fi

# 2. Trunk
if ! command -v trunk &>/dev/null; then
	log "Installing trunk..."
	curl https://get.trunk.io -fsSL | bash
fi

log "Installing workspace dependencies..."
pnpm install

# 3. Python Virtualenvs across the workspace
WORKSPACE_ROOT=$(git rev-parse --show-toplevel)

setup_venv() {
	local dir="$1"
	local reqs="$2"
	if [[ -d $dir ]]; then
		log "Setting up venv in $dir..."
		cd "$dir"
		if [[ ! -d ".venv" ]]; then
			python3 -m venv .venv
		fi
		source .venv/bin/activate
		if [[ -f $reqs ]]; then
			pip install -r "$reqs"
		elif [[ -f "pyproject.toml" ]]; then
			pip install .
		fi
		deactivate
		cd "$WORKSPACE_ROOT"
	fi
}

setup_venv "platform/n00man" "requirements.txt"
setup_venv "platform/n00-school" "requirements.txt"
setup_venv "platform/n00-horizons" "requirements.txt"
# Add other python projects here

# 4. Git Hooks
log "Installing git hooks..."
./scripts/install-hooks.sh

log "✅ Workspace setup complete!"
echo "Run 'n00t project sync' to initialize metadata."
