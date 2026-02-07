#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", [join("scripts", "check-node-version.mjs")]);
run("bash", [join("scripts", "check-pnpm-store-version.sh")]);
