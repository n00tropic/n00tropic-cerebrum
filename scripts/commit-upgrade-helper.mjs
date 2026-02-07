#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf-8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }
  return String(result.stdout || "").trim();
}

const status = run("git", ["status", "--short"]);
const stat = run("git", ["diff", "--stat"]);

console.log("\n[commit-upgrade] Working tree summary:\n");
console.log(status || "(clean)");

console.log("\n[commit-upgrade] Diff stat:\n");
console.log(stat || "(no diff)");

console.log("\n[commit-upgrade] Suggested commit message:\n");
console.log("chore: upgrade workspace toolchain and deps");
console.log("\nDetails to include:");
console.log("- Toolchain pins updated (Node/pnpm/TypeScript/Storybook)");
console.log("- Dependency updates and lockfile refresh");
console.log("- Script/docs sync (if applicable)");
