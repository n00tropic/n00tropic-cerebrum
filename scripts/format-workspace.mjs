#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DEFAULT_PATTERNS = [
  "platform/n00tropic/**/*.{ts,tsx,js,json,md,html,css}",
  "platform/n00man/**",
  "platform/n00menon/**",
  "platform/n00plicate/**/*.{ts,tsx,js,json,md,html,css}",
  "platform/n00t/**/*.{ts,tsx,js,json,md,html,css}",
  "mcp/**",
  "scripts/**",
  "*.json",
  "*.md",
];

function hasGlob(value) {
  return /[\*\?\[\{]/.test(value);
}

function parseArgs(argv) {
  const scopes = [];
  const patterns = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--scope") {
      const scope = argv[i + 1];
      if (scope) {
        scopes.push(scope);
        i += 1;
      }
      continue;
    }
    if (arg === "--pattern") {
      const pattern = argv[i + 1];
      if (pattern) {
        patterns.push(pattern);
        i += 1;
      }
      continue;
    }
  }

  return { scopes, patterns };
}

function buildPatterns(scopes, patterns) {
  if (patterns.length > 0) {
    return patterns;
  }
  if (scopes.length === 0) {
    return DEFAULT_PATTERNS;
  }

  return scopes.map((scope) => {
    if (hasGlob(scope)) {
      return scope;
    }
    return `${scope}/**/*.{ts,tsx,js,json,md,html,css}`;
  });
}

const { scopes, patterns } = parseArgs(process.argv.slice(2));
const targets = buildPatterns(scopes, patterns);

if (targets.length === 0) {
  console.error("[format-workspace] No targets provided.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prettier", "--write", ...targets], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
