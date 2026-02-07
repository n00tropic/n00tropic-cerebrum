#!/usr/bin/env node

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET_ROOT = join(
  ROOT,
  "platform",
  "n00tropic",
  ".dev",
  "automation",
  "scripts",
);
const SOURCE_ROOT = join(ROOT, ".dev", "automation", "scripts");

const SKIP_DIRS = new Set(["node_modules", ".git", ".cache", ".tmp"]);

function isScriptExt(fileName) {
  return fileName.endsWith(".sh") || fileName.endsWith(".py");
}

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function bashWrapper(relPath) {
  return `#!/usr/bin/env bash\nset -euo pipefail\n\n# Wrapper for the canonical automation script.\nROOT=$(git -C "$(dirname \"$0\")" rev-parse --show-toplevel)\nSCRIPT="$ROOT/.dev/automation/scripts/${relPath}"\n\nbash "$SCRIPT" "$@"\n`;
}

function pythonWrapper(relPath) {
  return `#!/usr/bin/env python3\n"""Wrapper for the canonical automation script."""\n\nfrom __future__ import annotations\n\nimport subprocess\nfrom pathlib import Path\n\nROOT = Path(__file__).resolve()\nROOT = Path(subprocess.check_output(["git", "-C", str(ROOT.parent), "rev-parse", "--show-toplevel"], text=True).strip())\nSCRIPT = ROOT / ".dev" / "automation" / "scripts" / "${relPath}"\n\nraise SystemExit(subprocess.call(["python3", str(SCRIPT), *__import__("sys").argv[1:]]))\n`;
}

async function maybeWrap(filePath) {
  const rel = relative(TARGET_ROOT, filePath).replace(/\\/g, "/");
  if (!isScriptExt(rel)) return { rel, status: "skip-ext" };

  const sourcePath = join(SOURCE_ROOT, rel);
  try {
    const [targetContent, sourceContent] = await Promise.all([
      readFile(filePath, "utf-8"),
      readFile(sourcePath, "utf-8"),
    ]);
    if (targetContent !== sourceContent) {
      return { rel, status: "skip-different" };
    }
  } catch {
    return { rel, status: "skip-missing-source" };
  }

  const wrapper = rel.endsWith(".sh") ? bashWrapper(rel) : pythonWrapper(rel);
  await writeFile(filePath, wrapper, "utf-8");
  return { rel, status: "wrapped" };
}

async function main() {
  const stats = await stat(TARGET_ROOT).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    console.error(`[wrap-automation] Target not found: ${TARGET_ROOT}`);
    process.exit(1);
  }

  const files = await walk(TARGET_ROOT);
  const results = { wrapped: 0, skipDifferent: 0, skipMissing: 0, skipExt: 0 };

  for (const file of files) {
    const outcome = await maybeWrap(file);
    if (outcome.status === "wrapped") results.wrapped += 1;
    else if (outcome.status === "skip-different") results.skipDifferent += 1;
    else if (outcome.status === "skip-missing-source") results.skipMissing += 1;
    else results.skipExt += 1;
  }

  console.log("[wrap-automation] Done.");
  console.log(`  wrapped: ${results.wrapped}`);
  console.log(`  skipped (different): ${results.skipDifferent}`);
  console.log(`  skipped (missing source): ${results.skipMissing}`);
  console.log(`  skipped (non-script): ${results.skipExt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
