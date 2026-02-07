#!/usr/bin/env node

import { readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = join(ROOT, "scripts", "script-catalog.md");

const SKIP_DIRS = new Set([
  ".git",
  ".pnpm-store",
  "node_modules",
  "dist",
  "build",
  "artifacts",
  "coverage",
  ".venv",
  ".venv-workspace",
  ".cache",
  ".cache_local",
  ".tmp",
]);

const ALLOW_HIDDEN = new Set([".dev"]);

const SCRIPT_EXTENSIONS = new Set([".sh", ".mjs", ".js", ".cjs", ".py"]);

function isHiddenDir(name) {
  return name.startsWith(".") && !ALLOW_HIDDEN.has(name);
}

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name) || isHiddenDir(name);
}

function hasScriptExtension(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return false;
  return SCRIPT_EXTENSIONS.has(fileName.slice(dot));
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      await walk(join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    files.push(join(dir, entry.name));
  }
  return files;
}

function categorize(relPath) {
  if (relPath.startsWith("scripts/")) return "Root scripts";
  if (relPath.startsWith("bin/")) return "Root bin";
  if (relPath.includes("/.dev/automation/scripts/")) {
    return "Automation scripts";
  }
  if (relPath.includes("/templates/") && relPath.includes("/scripts/")) {
    return "Template scripts";
  }
  if (relPath.includes("/mcp/") && relPath.includes("/scripts/")) {
    return "MCP scripts";
  }
  if (relPath.includes("/scripts/")) return "Subrepo scripts";
  if (relPath.includes("/tools/")) return "Tools scripts";
  return "Other scripts";
}

function shouldInclude(relPath) {
  if (relPath.startsWith(".pnpm-store/")) return false;
  if (relPath.includes("/node_modules/")) return false;
  if (relPath.startsWith("docs/") && relPath.includes("/examples/"))
    return false;
  return true;
}

async function main() {
  const allFiles = await walk(ROOT);
  const scriptFiles = [];

  for (const file of allFiles) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (!shouldInclude(rel)) continue;

    const base = rel.split("/").pop() || "";
    const isBin = rel.startsWith("bin/");
    if (!isBin && !hasScriptExtension(base)) continue;

    scriptFiles.push(rel);
  }

  const categories = new Map();
  for (const rel of scriptFiles) {
    const category = categorize(rel);
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(rel);
  }

  const orderedCategories = [
    "Root scripts",
    "Root bin",
    "Automation scripts",
    "Subrepo scripts",
    "MCP scripts",
    "Template scripts",
    "Tools scripts",
    "Other scripts",
  ];

  const lines = [];
  lines.push("# Script Catalog");
  lines.push("");
  lines.push(
    `Generated on ${new Date().toISOString().split("T")[0]}. Run \`node scripts/generate-script-catalog.mjs\` to refresh.`,
  );
  lines.push("");
  lines.push("Notes:");
  lines.push(
    "- Excludes node_modules, .pnpm-store, dist/build/artifacts, and cache/temp directories.",
  );
  lines.push(
    "- Template and example scripts are listed separately for clarity.",
  );

  for (const category of orderedCategories) {
    const items = categories.get(category);
    if (!items || items.length === 0) continue;
    items.sort();
    lines.push("");
    lines.push(`## ${category} (${items.length})`);
    lines.push("");
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }

  await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf-8");
  console.log(`[script-catalog] Wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
