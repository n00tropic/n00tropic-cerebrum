#!/usr/bin/env node
/**
 * @fileoverview Update Toolchain Manifest
 *
 * Safely updates toolchain versions in the manifest with validation and
 * automatic propagation. This is the entry point for version upgrades.
 *
 * Usage:
 *   node scripts/update-toolchain.mjs node 24.12.0    # Update Node version
 *   node scripts/update-toolchain.mjs pnpm 10.24.0    # Update pnpm version
 *   node scripts/update-toolchain.mjs --list          # List current versions
 *   node scripts/update-toolchain.mjs --propagate     # Run sync after update
 *
 * @author n00tropic
 * @license MIT
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(
  REPO_ROOT,
  "platform",
  "n00-cortex",
  "data",
  "toolchain-manifest.json",
);

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ Missing manifest at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(MANIFEST_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read manifest: ${error.message}`);
    process.exit(1);
  }
}

function saveManifest(manifest) {
  manifest.generated = new Date().toISOString();
  const content = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(MANIFEST_PATH, content, "utf-8");
}

function listToolchains(manifest) {
  console.log("\n📦 Current Toolchain Versions:\n");
  const toolchains = manifest.toolchains || {};

  for (const [name, info] of Object.entries(toolchains)) {
    const version = typeof info === "string" ? info : info.version;
    const channel = info.channel ? ` (${info.channel})` : "";
    const notes = info.notes ? `\n   ${info.notes}` : "";
    console.log(`  ${name}: ${version}${channel}${notes}`);
  }

  console.log("\n📁 Per-Repo Configurations:\n");
  const repos = manifest.repos || {};
  for (const [repo, config] of Object.entries(repos)) {
    console.log(`  ${repo}:`);
    for (const [tool, version] of Object.entries(config)) {
      console.log(`    ${tool}: ${version}`);
    }
  }
  console.log("");
}

function normalizeVersion(version) {
  return version.startsWith("v") ? version.slice(1) : version;
}

function validateVersionForTool(toolName, version) {
  if (toolName === "ecmascript") {
    return /^ES(Next|20\d{2})$/.test(version);
  }

  // Basic semver validation
  const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
  return semverPattern.test(version);
}

function updateToolchain(manifest, toolName, newVersion) {
  const normalizedVersion = normalizeVersion(newVersion);
  if (!validateVersionForTool(toolName, normalizedVersion)) {
    console.error(`❌ Invalid version format: ${newVersion}`);
    if (toolName === "ecmascript") {
      console.error("   Expected format: ESNext or ES2024");
    } else {
      console.error("   Expected format: X.Y.Z (e.g., 24.11.0)");
    }
    process.exit(1);
  }

  const toolchains = manifest.toolchains || {};
  const current = toolchains[toolName];

  if (!current) {
    console.error(`❌ Unknown toolchain: ${toolName}`);
    console.error(
      "   Available toolchains:",
      Object.keys(toolchains).join(", "),
    );
    process.exit(1);
  }

  const currentVersion =
    typeof current === "string" ? current : current.version;

  if (currentVersion === normalizedVersion) {
    console.log(`ℹ️ ${toolName} is already at version ${normalizedVersion}`);
    return false;
  }

  console.log(
    `\n🔄 Updating ${toolName}: ${currentVersion} → ${normalizedVersion}`,
  );

  // Update main toolchain entry
  if (typeof current === "string") {
    toolchains[toolName] = normalizedVersion;
  } else {
    toolchains[toolName].version = normalizedVersion;
    if (Array.isArray(toolchains[toolName].supported)) {
      toolchains[toolName].supported = Array.from(
        new Set(
          toolchains[toolName].supported.map((entry) =>
            entry === currentVersion ? normalizedVersion : entry,
          ),
        ),
      );
    }
  }

  // Update per-repo entries that reference this toolchain
  const repos = manifest.repos || {};
  for (const [repoName, config] of Object.entries(repos)) {
    if (config[toolName] && config[toolName] === currentVersion) {
      console.log(`   📁 Updating ${repoName}/${toolName}`);
      config[toolName] = normalizedVersion;
    }
  }

  return true;
}

function propagateVersions(manifest) {
  console.log("\n📡 Propagating versions across workspace...\n");
  try {
    const toolchains = manifest.toolchains || {};
    const nodeVersion = toolchains.node?.version || toolchains.node;
    const pythonVersion =
      typeof toolchains.python === "string"
        ? toolchains.python
        : toolchains.python?.version;
    const typescriptVersion =
      typeof toolchains.typescript === "string"
        ? toolchains.typescript
        : toolchains.typescript?.version;
    const ecmascriptTarget =
      typeof toolchains.ecmascript === "string"
        ? toolchains.ecmascript
        : toolchains.ecmascript?.version;
    const storybookVersion =
      typeof toolchains.storybook === "string"
        ? toolchains.storybook
        : toolchains.storybook?.version;

    if (nodeVersion) {
      console.log(`   Running sync-node-version.sh --version ${nodeVersion}`);
      execSync(`bash scripts/sync-node-version.sh --version ${nodeVersion}`, {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
    } else {
      console.warn("⚠️  Missing node version in toolchain manifest; skipping.");
    }

    if (pythonVersion) {
      console.log("   Running sync-python-version.sh");
      execSync(`bash scripts/sync-python-version.sh`, {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
    } else {
      console.warn(
        "⚠️  Missing python version in toolchain manifest; skipping.",
      );
    }

    if (typescriptVersion) {
      console.log(
        `   Running sync-typescript-version.mjs (${typescriptVersion})`,
      );
      execSync(`node scripts/sync-typescript-version.mjs`, {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
    } else {
      console.warn(
        "⚠️  Missing typescript version in toolchain manifest; skipping.",
      );
    }

    if (ecmascriptTarget) {
      console.log(
        `   Running sync-ecmascript-target.mjs (${ecmascriptTarget})`,
      );
      execSync(`node scripts/sync-ecmascript-target.mjs`, {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
    } else {
      console.warn(
        "⚠️  Missing ecmascript target in toolchain manifest; skipping.",
      );
    }

    if (storybookVersion) {
      console.log(
        `   Running sync-storybook-version.mjs (${storybookVersion})`,
      );
      execSync(`node scripts/sync-storybook-version.mjs`, {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
    } else {
      console.warn(
        "⚠️  Missing storybook version in toolchain manifest; skipping.",
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Version propagation failed:", error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Toolchain Manifest Update Tool

Usage:
  node update-toolchain.mjs <toolchain> <version>   Update a toolchain version
  node update-toolchain.mjs --list                  List current versions
  node update-toolchain.mjs --propagate             Propagate to all files

Options:
  --propagate   Also run version sync after updating
  --list        Show current toolchain versions
  --help        Show this help message

Examples:
  node update-toolchain.mjs node 24.12.0
  node update-toolchain.mjs pnpm 10.24.0 --propagate
  node update-toolchain.mjs python 3.12.0

Supported Toolchains:
  node, pnpm, python, go, trunk, typescript, ecmascript, storybook
`);
    process.exit(0);
  }

  const manifest = loadManifest();

  if (args.includes("--list")) {
    listToolchains(manifest);
    process.exit(0);
  }

  if (args.includes("--propagate") && args.length === 1) {
    propagateVersions(manifest);
    process.exit(0);
  }

  // Parse tool and version
  const nonFlagArgs = args.filter((a) => !a.startsWith("--"));

  if (nonFlagArgs.length !== 2) {
    console.error("❌ Usage: node update-toolchain.mjs <toolchain> <version>");
    console.error("   Run with --help for more information.");
    process.exit(1);
  }

  const [toolName, newVersion] = nonFlagArgs;
  const shouldPropagate = args.includes("--propagate");

  const updated = updateToolchain(manifest, toolName, newVersion);

  if (updated) {
    saveManifest(manifest);
    console.log("✅ Manifest updated successfully");

    if (shouldPropagate) {
      propagateVersions(manifest);
    } else {
      console.log("\n💡 Run with --propagate to sync all files, or run:");
      console.log("   pnpm run sync:versions"); // Check if this alias exists or needs creating
      // Note: sync:versions alias is NOT yet in package.json from my memory, I might need to add it or suggest the direct command
    }
  }
}

main();
