#!/usr/bin/env node
/**
 * Sync toolchain pins across workspace subprojects
 *
 * This script ensures consistent packageManager and engines versions
 * across all package.json files in the workspace.
 *
 * Usage:
 *   node scripts/sync-toolchain-pins.mjs [--check] [--fix]
 *
 * Options:
 *   --check    Exit with non-zero if drift detected (CI mode)
 *   --fix      Apply fixes automatically
 */

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Canonical versions (source of truth from root package.json)
const TARGET_PNPM_VERSION = "10.29.1";
const TARGET_NODE_VERSION = ">=25.6.0";
const TARGET_PNPM_ENGINE = ">=10.29.1";

const PACKAGE_MANAGER_PATTERN = /"packageManager":\s*"pnpm@[^"]+"/;

async function getRootPackageJson() {
  const content = await readFile(join(ROOT, "package.json"), "utf8");
  return JSON.parse(content);
}

async function findSubprojectPackageJsons() {
  // Find all package.json files in platform/ directory
  const patterns = [
    "platform/*/package.json",
    "platform/*/*/package.json", // For nested workspaces
  ];

  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: ROOT, absolute: true });
    files.push(...matches);
  }

  return files.filter((f) => !f.includes("node_modules"));
}

async function checkPackageJson(filePath) {
  const content = await readFile(filePath, "utf8");
  const issues = [];

  // Check packageManager
  const pmMatch = content.match(/"packageManager":\s*"(pnpm@[^"]+)"/);
  if (pmMatch) {
    const currentVersion = pmMatch[1];
    const expectedPm = `pnpm@${TARGET_PNPM_VERSION}`;
    if (currentVersion !== expectedPm) {
      issues.push({
        type: "packageManager",
        current: currentVersion,
        expected: expectedPm,
        line: content.substring(0, pmMatch.index).split("\n").length,
      });
    }
  }

  // Check engines.pnpm
  const enginesMatch = content.match(/"engines":\s*{[^}]*"pnpm":\s*"([^"]+)"/s);
  if (enginesMatch) {
    const currentEngine = enginesMatch[1];
    if (currentEngine !== TARGET_PNPM_ENGINE) {
      issues.push({
        type: "engines.pnpm",
        current: currentEngine,
        expected: TARGET_PNPM_ENGINE,
        line: content.substring(0, enginesMatch.index).split("\n").length,
      });
    }
  }

  // Check engines.node
  const nodeMatch = content.match(/"engines":\s*{[^}]*"node":\s*"([^"]+)"/s);
  if (nodeMatch) {
    const currentNode = nodeMatch[1];
    if (currentNode !== TARGET_NODE_VERSION) {
      issues.push({
        type: "engines.node",
        current: currentNode,
        expected: TARGET_NODE_VERSION,
        line: content.substring(0, nodeMatch.index).split("\n").length,
      });
    }
  }

  return { filePath, content, issues, hasPackageManager: !!pmMatch };
}

function fixPackageJson(content, issues) {
  let fixed = content;

  for (const issue of issues) {
    switch (issue.type) {
      case "packageManager":
        fixed = fixed.replace(
          PACKAGE_MANAGER_PATTERN,
          `"packageManager": "${issue.expected}"`,
        );
        break;
      case "engines.pnpm":
        fixed = fixed.replace(
          /("pnpm":\s*")([^"]+)(")/,
          `$1${TARGET_PNPM_ENGINE}$3`,
        );
        break;
      case "engines.node":
        fixed = fixed.replace(
          /("node":\s*")([^"]+)(")/,
          `$1${TARGET_NODE_VERSION}$3`,
        );
        break;
    }
  }

  return fixed;
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");
  const fixMode = args.includes("--fix");

  console.log("🔧 Toolchain Pin Sync");
  console.log(
    `Target versions: pnpm ${TARGET_PNPM_VERSION}, node ${TARGET_NODE_VERSION}`,
  );
  console.log("");

  const rootPkg = await getRootPackageJson();
  console.log(
    `Root package.json: ${rootPkg.packageManager || "no packageManager"}`,
  );
  console.log("");

  const files = await findSubprojectPackageJsons();
  console.log(`Found ${files.length} subproject package.json files`);
  console.log("");

  let totalIssues = 0;
  let fixedCount = 0;

  for (const file of files) {
    const relativePath = file.replace(ROOT, "").replace(/^\//, "");
    const result = await checkPackageJson(file);

    if (result.issues.length > 0) {
      totalIssues += result.issues.length;
      console.log(`❌ ${relativePath}`);

      for (const issue of result.issues) {
        console.log(`   Line ${issue.line}: ${issue.type}`);
        console.log(`   Current:  ${issue.current}`);
        console.log(`   Expected: ${issue.expected}`);
      }

      if (fixMode) {
        const fixed = fixPackageJson(result.content, result.issues);
        await writeFile(file, fixed, "utf8");
        console.log(`   ✅ Fixed`);
        fixedCount++;
      }

      console.log("");
    } else if (result.hasPackageManager) {
      console.log(`✅ ${relativePath}`);
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`Summary: ${totalIssues} issues found`);

  if (fixMode) {
    console.log(`Fixed: ${fixedCount} files`);
  }

  if (checkMode && totalIssues > 0) {
    console.log("");
    console.log("❌ Toolchain drift detected! Run with --fix to auto-correct.");
    process.exit(1);
  }

  if (totalIssues === 0) {
    console.log("✅ All toolchain pins are consistent!");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
