#!/usr/bin/env bash
set -e

# Fix Root (n00tropic-cerebrum + lint-staged root files)
echo "🔧 Fixing root..."
pnpm exec biome check --write .

# Fix n00t
echo "🔧 Fixing n00t..."
cd n00t && pnpm exec biome check --write . && cd ..

# Fix n00-cortex
echo "🔧 Fixing n00-cortex..."
cd n00-cortex && pnpm exec biome check --write . && cd ..

# Fix n00menon
echo "🔧 Fixing n00menon..."
cd n00menon && pnpm exec biome check --write . && cd ..

echo "✅ All fixed!"
