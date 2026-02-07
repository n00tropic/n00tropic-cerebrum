#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function findWorkspaceRoot(startDir) {
  let current = startDir;
  while (current !== path.dirname(current)) {
    const marker = path.join(current, "pnpm-workspace.yaml");
    const pkg = path.join(current, "package.json");
    if (existsSync(marker) && existsSync(pkg)) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

const cwd = process.cwd();
const root = findWorkspaceRoot(cwd);
const localBin = path.join(cwd, "node_modules", ".bin", "typedoc");
const rootBin = root
  ? path.join(root, "node_modules", ".bin", "typedoc")
  : null;

const args = process.argv.slice(2);
let cmd = null;
let cmdArgs = [];

if (existsSync(localBin)) {
  cmd = localBin;
  cmdArgs = args;
} else if (rootBin && existsSync(rootBin)) {
  cmd = rootBin;
  cmdArgs = args;
} else {
  console.error("[run-typedoc] typedoc binary not found.");
  process.exit(1);
}

const result = spawnSync(cmd, cmdArgs, {
  stdio: "inherit",
  cwd,
  env: { ...process.env },
});

process.exit(result.status ?? 1);
