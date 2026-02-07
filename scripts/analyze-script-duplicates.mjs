#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = join(ROOT, "scripts", "script-duplicates.md");

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
      if (shouldSkipDir(entry.name)) continue;
      await walk(join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function shouldInclude(relPath) {
  if (relPath.startsWith(".pnpm-store/")) return false;
  if (relPath.includes("/node_modules/")) return false;
  if (relPath.startsWith("docs/") && relPath.includes("/examples/"))
    return false;
  return true;
}

function isScript(relPath) {
  const base = relPath.split("/").pop() || "";
  if (base === "__init__.py") return false;
  if (relPath.startsWith("bin/")) return true;
  if (!hasScriptExtension(base)) return false;
  if (relPath.startsWith("scripts/")) return true;
  if (relPath.includes("/scripts/")) return true;
  if (relPath.includes("/tools/")) return true;
  return false;
}

function bucketForPath(relPath) {
  if (relPath.startsWith("scripts/")) return "root";
  if (relPath.startsWith("bin/")) return "bin";
  if (relPath.includes("/.dev/automation/scripts/")) return "automation";
  if (relPath.includes("/templates/") && relPath.includes("/scripts/"))
    return "templates";
  if (relPath.includes("/mcp/") && relPath.includes("/scripts/")) return "mcp";
  if (relPath.includes("/scripts/")) return "subrepo";
  if (relPath.includes("/tools/")) return "tools";
  return "other";
}

function isWrapperContent(content) {
  return (
    content.includes("Wrapper for the canonical automation script") ||
    content.includes("Wrapper for central") ||
    content.includes('SCRIPT="$ROOT/.dev/automation/scripts/') ||
    content.includes('SCRIPT = ROOT / ".dev" / "automation" / "scripts"')
  );
}

async function main() {
  const allFiles = await walk(ROOT);
  const scripts = [];

  for (const file of allFiles) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (!shouldInclude(rel)) continue;
    if (!isScript(rel)) continue;
    scripts.push(rel);
  }

  const byName = new Map();
  const wrappers = new Map();
  for (const rel of scripts) {
    const name = rel.split("/").pop() || rel;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(rel);
    try {
      const content = await readFile(join(ROOT, rel), "utf-8");
      wrappers.set(rel, isWrapperContent(content));
    } catch {
      wrappers.set(rel, false);
    }
  }

  const duplicates = Array.from(byName.entries())
    .filter(([, paths]) => paths.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const lines = [];
  lines.push("# Script Duplicate Report");
  lines.push("");
  lines.push(
    `Generated on ${new Date().toISOString().split("T")[0]}. Run \`node scripts/analyze-script-duplicates.mjs\` to refresh.`,
  );
  lines.push("");
  lines.push("Notes:");
  lines.push("- Same basename across different paths is flagged.");
  lines.push(
    "- Excludes node_modules, .pnpm-store, dist/build/artifacts, and cache/temp directories.",
  );
  lines.push("");
  lines.push(`Total scripts scanned: ${scripts.length}`);
  lines.push(`Duplicate basenames: ${duplicates.length}`);

  for (const [name, paths] of duplicates) {
    const buckets = new Map();
    for (const rel of paths) {
      const bucket = bucketForPath(rel);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(rel);
    }
    lines.push("");
    lines.push(`## ${name} (${paths.length})`);
    for (const [bucket, items] of buckets.entries()) {
      items.sort();
      lines.push(`- ${bucket}: ${items.length}`);
      for (const item of items) {
        const suffix = wrappers.get(item) ? " (wrapper)" : "";
        lines.push(`  - ${item}${suffix}`);
      }
    }
  }

  await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf-8");
  console.log(`[script-duplicates] Wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
