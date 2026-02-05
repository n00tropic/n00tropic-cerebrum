#!/bin/bash
set -e

# Sync pnpm dependencies recursively and deduplicate
echo "🔄 Updating dependencies recursively to latest..."
pnpm up -r -L

echo "🧹 Deduplicating..."
pnpm dedupe

echo "📦 Pruning store..."
pnpm store prune

echo "✨ Dependency update complete!"
