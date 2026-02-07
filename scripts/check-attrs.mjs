#!/usr/bin/env node
/**
 * Wrapper for central check-attrs.mjs
 */
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const SCRIPT = resolve(ROOT, ".dev/automation/scripts/check-attrs.mjs");
const ARGS = process.argv.slice(2);

const result = spawnSync("node", [SCRIPT, ...ARGS], { stdio: "inherit" });
process.exit(result.status ?? 1);
