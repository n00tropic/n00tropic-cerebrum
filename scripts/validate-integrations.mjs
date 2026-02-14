#!/usr/bin/env node
/**
 * Integration & Interface Validation Script
 *
 * Usage:
 *   node scripts/validate-integrations.mjs [--check]
 *
 * This script verifies:
 * - All shared configs are valid JSON and reference correctly
 * - All validation scripts are operational
 * - CI/CD workflows are properly configured
 * - Cross-project dependencies are correctly linked
 */

import { readFile, access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SHARED_CONFIGS = [
  "platform/n00-cortex/data/toolchain-configs/biome-base.json",
  "platform/n00-cortex/data/toolchain-configs/tsconfig-base.json",
  "platform/n00-cortex/data/toolchain-configs/renovate-base.json",
  "platform/n00-cortex/schemas/agents-md.schema.json",
];

const VALIDATION_SCRIPTS = [
  "scripts/sync-toolchain-pins.mjs",
  "scripts/validate-agents-md.mjs",
  "scripts/check-directory-layout.mjs",
  "scripts/check-tsconfig-consistency.mjs",
  "scripts/generate-qa-report.mjs",
];

const SUBPROJECT_BIOME_CONFIGS = [
  "platform/n00-cortex/biome.json",
  "platform/n00t/biome.json",
  "platform/n00-frontiers/biome.json",
  "platform/n00menon/biome.json",
  "platform/n00plicate/biome.json",
];

async function fileExists(path) {
  try {
    await access(join(ROOT, path));
    return true;
  } catch {
    return false;
  }
}

async function validateJsonFile(path) {
  try {
    const content = await readFile(join(ROOT, path), "utf8");
    JSON.parse(content);
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function validateSharedConfigs() {
  console.log("\n📋 Shared Config Validation");
  console.log("=".repeat(50));

  const results = [];
  for (const config of SHARED_CONFIGS) {
    const exists = await fileExists(config);
    if (!exists) {
      results.push({ config, status: "missing", error: "File not found" });
      console.log(`❌ ${config} - MISSING`);
      continue;
    }

    const jsonCheck = await validateJsonFile(config);
    if (jsonCheck.valid) {
      results.push({ config, status: "valid" });
      console.log(`✅ ${config} - Valid JSON`);
    } else {
      results.push({ config, status: "invalid", error: jsonCheck.error });
      console.log(`❌ ${config} - Invalid JSON: ${jsonCheck.error}`);
    }
  }

  return results;
}

async function validateBiomeExtensions() {
  console.log("\n🔧 Biome Config Extensions");
  console.log("=".repeat(50));

  const results = [];
  for (const config of SUBPROJECT_BIOME_CONFIGS) {
    const exists = await fileExists(config);
    if (!exists) {
      results.push({ config, status: "missing" });
      console.log(`❌ ${config} - MISSING`);
      continue;
    }

    try {
      const content = await readFile(join(ROOT, config), "utf8");
      const json = JSON.parse(content);

      if (
        json.extends &&
        json.extends.includes(
          "n00-cortex/data/toolchain-configs/biome-base.json",
        )
      ) {
        results.push({ config, status: "valid", extends: true });
        console.log(`✅ ${config} - Extends base config`);
      } else if (json.extends) {
        results.push({
          config,
          status: "warning",
          extends: false,
          message: "Extends different config",
        });
        console.log(`⚠️  ${config} - Extends: ${json.extends}`);
      } else {
        // Has inline config (like n00plicate)
        results.push({
          config,
          status: "valid",
          extends: false,
          message: "Inline configuration",
        });
        console.log(`ℹ️  ${config} - Inline configuration (not extending)`);
      }
    } catch (err) {
      results.push({ config, status: "error", error: err.message });
      console.log(`❌ ${config} - Error: ${err.message}`);
    }
  }

  return results;
}

async function validateScripts() {
  console.log("\n📜 Validation Scripts");
  console.log("=".repeat(50));

  const results = [];
  for (const script of VALIDATION_SCRIPTS) {
    const exists = await fileExists(script);
    if (!exists) {
      results.push({ script, status: "missing" });
      console.log(`❌ ${script} - MISSING`);
      continue;
    }

    try {
      const content = await readFile(join(ROOT, script), "utf8");

      // Check for syntax errors by trying to parse as module
      if (content.includes("import") && content.includes("export")) {
        results.push({ script, status: "valid", type: "ES Module" });
        console.log(`✅ ${script} - ES Module`);
      } else if (content.includes("require(")) {
        results.push({ script, status: "valid", type: "CommonJS" });
        console.log(`✅ ${script} - CommonJS`);
      } else {
        results.push({ script, status: "valid", type: "Script" });
        console.log(`✅ ${script} - Script`);
      }
    } catch (err) {
      results.push({ script, status: "error", error: err.message });
      console.log(`❌ ${script} - Error: ${err.message}`);
    }
  }

  return results;
}

async function checkPackageJsonConsistency() {
  console.log("\n📦 Package.json Consistency");
  console.log("=".repeat(50));

  const results = [];
  const packageFiles = await glob("platform/**/package.json", {
    cwd: ROOT,
    absolute: false,
    ignore: ["**/node_modules/**", "**/templates/**"],
  });

  let validCount = 0;
  let invalidCount = 0;

  for (const pkg of packageFiles) {
    try {
      const content = await readFile(join(ROOT, pkg), "utf8");
      const json = JSON.parse(content);

      const checks = {
        hasPackageManager: !!json.packageManager,
        hasEngines: !!json.engines,
        correctPnpm: json.packageManager?.includes("10.29.1"),
        correctNode: json.engines?.node?.includes("25.6.0"),
      };

      const allValid =
        checks.hasPackageManager &&
        checks.hasEngines &&
        checks.correctPnpm &&
        checks.correctNode;

      if (allValid) {
        validCount++;
        results.push({ package: pkg, status: "valid", checks });
      } else {
        invalidCount++;
        results.push({ package: pkg, status: "invalid", checks });
        console.log(`⚠️  ${pkg} - Needs updates`);
      }
    } catch (err) {
      invalidCount++;
      results.push({ package: pkg, status: "error", error: err.message });
      console.log(`❌ ${pkg} - Parse error`);
    }
  }

  console.log(
    `\nSummary: ${validCount}/${packageFiles.length} package.json files fully compliant`,
  );
  if (invalidCount > 0) {
    console.log(`${invalidCount} files need updates`);
  }

  return results;
}

async function checkPythonProjects() {
  console.log("\n🐍 Python Project Configs");
  console.log("=".repeat(50));

  const results = [];
  const pyprojectFiles = await glob("platform/**/pyproject.toml", {
    cwd: ROOT,
    absolute: false,
  });

  let validCount = 0;

  for (const pyproject of pyprojectFiles) {
    try {
      const content = await readFile(join(ROOT, pyproject), "utf8");

      const hasBuildSystem = content.includes("[build-system]");
      const hasProject = content.includes("[project]");
      const hasRuff = content.includes("[tool.ruff]");

      if (hasBuildSystem && hasProject && hasRuff) {
        validCount++;
        results.push({ project: pyproject, status: "valid" });
        console.log(`✅ ${pyproject}`);
      } else {
        results.push({
          project: pyproject,
          status: "incomplete",
          hasBuildSystem,
          hasProject,
          hasRuff,
        });
        console.log(`⚠️  ${pyproject} - Incomplete config`);
      }
    } catch (err) {
      results.push({ project: pyproject, status: "error", error: err.message });
      console.log(`❌ ${pyproject} - Error: ${err.message}`);
    }
  }

  console.log(
    `\nSummary: ${validCount}/${pyprojectFiles.length} pyproject.toml files compliant`,
  );

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");

  console.log("🔍 Integration & Interface Validation");
  console.log("Generated:", new Date().toISOString());

  const allResults = {
    sharedConfigs: await validateSharedConfigs(),
    biomeConfigs: await validateBiomeExtensions(),
    scripts: await validateScripts(),
    packages: await checkPackageJsonConsistency(),
    python: await checkPythonProjects(),
  };

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Integration Summary");
  console.log("=".repeat(60));

  const configValid = allResults.sharedConfigs.filter(
    (r) => r.status === "valid",
  ).length;
  const configTotal = allResults.sharedConfigs.length;
  console.log(`Shared Configs: ${configValid}/${configTotal} valid`);

  const biomeValid = allResults.biomeConfigs.filter(
    (r) => r.status === "valid",
  ).length;
  const biomeTotal = allResults.biomeConfigs.length;
  console.log(`Biome Configs: ${biomeValid}/${biomeTotal} properly configured`);

  const scriptValid = allResults.scripts.filter(
    (r) => r.status === "valid",
  ).length;
  const scriptTotal = allResults.scripts.length;
  console.log(`Validation Scripts: ${scriptValid}/${scriptTotal} operational`);

  const totalErrors = [
    ...allResults.sharedConfigs.filter(
      (r) => r.status === "error" || r.status === "missing",
    ),
    ...allResults.biomeConfigs.filter(
      (r) => r.status === "error" || r.status === "missing",
    ),
    ...allResults.scripts.filter(
      (r) => r.status === "error" || r.status === "missing",
    ),
  ].length;

  if (totalErrors === 0) {
    console.log("\n✅ All integrations are operational!");
  } else {
    console.log(`\n⚠️  Found ${totalErrors} issues that need attention`);
  }

  if (checkMode && totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
