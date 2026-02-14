#!/usr/bin/env node
/**
 * Directory Layout Validation Script
 *
 * Usage:
 *   node scripts/check-directory-layout.mjs [--check]
 *
 * Options:
 *   --check    Exit with non-zero if inconsistencies found
 *   --json     Output JSON report
 */

import { readFile, readdir, stat, access } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PYTHON_PROJECTS = [
  "platform/n00tropic",
  "platform/n00man",
  "platform/n00-school",
  "platform/n00clear-fusion",
  "platform/n00-horizons",
];

const TYPESCRIPT_PROJECTS = [
  "platform/n00-cortex",
  "platform/n00t",
  "platform/n00-frontiers",
  "platform/n00menon",
  "platform/n00plicate",
];

async function fileExists(path) {
  try {
    await access(join(ROOT, path));
    return true;
  } catch {
    return false;
  }
}

async function checkPythonLayout(projectPath) {
  const issues = [];
  const fullPath = join(ROOT, projectPath);

  // Check for src/ directory
  const hasSrc = await fileExists(join(projectPath, "src"));

  // Check for flat layout (Python files at root)
  const pyFilesAtRoot = await glob("*.py", { cwd: fullPath });
  const hasFlatLayout = pyFilesAtRoot.length > 0 && !hasSrc;

  // Check for pyproject.toml
  const hasPyproject = await fileExists(join(projectPath, "pyproject.toml"));

  // Check for requirements.txt (should migrate to pyproject.toml)
  const hasRequirements = await fileExists(
    join(projectPath, "requirements.txt"),
  );

  // Check for setup.py (deprecated)
  const hasSetupPy = await fileExists(join(projectPath, "setup.py"));

  // Check for tests/ directory
  const hasTestsDir = await fileExists(join(projectPath, "tests"));

  if (!hasSrc && !hasFlatLayout) {
    issues.push({
      type: "missing-src",
      severity: "error",
      message: "No src/ directory found",
    });
  }

  if (hasFlatLayout) {
    issues.push({
      type: "flat-layout",
      severity: "warning",
      message: "Using flat layout - should migrate to src/ layout",
    });
  }

  if (!hasPyproject) {
    issues.push({
      type: "missing-pyproject",
      severity: "error",
      message: "Missing pyproject.toml",
    });
  }

  if (hasRequirements) {
    issues.push({
      type: "legacy-requirements",
      severity: "warning",
      message: "requirements.txt exists - migrate to pyproject.toml",
    });
  }

  if (hasSetupPy) {
    issues.push({
      type: "legacy-setup",
      severity: "error",
      message: "setup.py exists - migrate to pyproject.toml",
    });
  }

  if (!hasTestsDir) {
    issues.push({
      type: "missing-tests",
      severity: "warning",
      message: "No tests/ directory found",
    });
  }

  return {
    project: projectPath,
    type: "python",
    issues,
    hasSrc,
    hasFlatLayout,
  };
}

async function checkTypeScriptLayout(projectPath) {
  const issues = [];

  // Check for package.json
  const hasPackageJson = await fileExists(join(projectPath, "package.json"));

  // Check for tsconfig.json
  const hasTsconfig = await fileExists(join(projectPath, "tsconfig.json"));

  // Check for src/ or lib/ directory
  const hasSrc = await fileExists(join(projectPath, "src"));
  const hasLib = await fileExists(join(projectPath, "lib"));

  // Check for tests/
  const hasTests =
    (await fileExists(join(projectPath, "tests"))) ||
    (await fileExists(join(projectPath, "__tests__"))) ||
    (await fileExists(join(projectPath, "test")));

  // Check for biome.json
  const hasBiome = await fileExists(join(projectPath, "biome.json"));

  // Check for vitest.config or similar
  const hasTestConfig =
    (await fileExists(join(projectPath, "vitest.config.ts"))) ||
    (await fileExists(join(projectPath, "vitest.config.js"))) ||
    (await fileExists(join(projectPath, "jest.config.js")));

  if (!hasPackageJson) {
    issues.push({
      type: "missing-package",
      severity: "error",
      message: "Missing package.json",
    });
  }

  if (!hasSrc && !hasLib) {
    issues.push({
      type: "missing-source",
      severity: "error",
      message: "No src/ or lib/ directory found",
    });
  }

  if (!hasTests) {
    issues.push({
      type: "missing-tests",
      severity: "warning",
      message: "No tests directory found",
    });
  }

  if (!hasBiome) {
    issues.push({
      type: "missing-biome",
      severity: "warning",
      message: "Missing biome.json - should extend base config",
    });
  }

  if (!hasTestConfig) {
    issues.push({
      type: "missing-test-config",
      severity: "warning",
      message: "Missing test configuration file",
    });
  }

  return {
    project: projectPath,
    type: "typescript",
    issues,
    hasSrc: hasSrc || hasLib,
  };
}

async function checkSharedFiles(projectPath) {
  const issues = [];

  // Check for AGENTS.md
  const hasAgents = await fileExists(join(projectPath, "AGENTS.md"));

  // Check for .github/
  const hasGithub = await fileExists(join(projectPath, ".github"));

  // Check for .env.example
  const hasEnvExample = await fileExists(join(projectPath, ".env.example"));

  // Check for README.md
  const hasReadme = await fileExists(join(projectPath, "README.md"));

  // Check for .gitignore
  const hasGitignore = await fileExists(join(projectPath, ".gitignore"));

  if (!hasAgents) {
    issues.push({
      type: "missing-agents",
      severity: "error",
      message: "Missing AGENTS.md",
    });
  }

  if (!hasGithub) {
    issues.push({
      type: "missing-github",
      severity: "warning",
      message: "Missing .github/ directory",
    });
  }

  if (!hasEnvExample) {
    issues.push({
      type: "missing-env",
      severity: "warning",
      message: "Missing .env.example",
    });
  }

  if (!hasReadme) {
    issues.push({
      type: "missing-readme",
      severity: "error",
      message: "Missing README.md",
    });
  }

  if (!hasGitignore) {
    issues.push({
      type: "missing-gitignore",
      severity: "error",
      message: "Missing .gitignore",
    });
  }

  return { issues };
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");
  const jsonMode = args.includes("--json");

  console.log("🔍 Directory Layout Validation\n");

  const results = [];

  // Check Python projects
  for (const project of PYTHON_PROJECTS) {
    const pythonCheck = await checkPythonLayout(project);
    const sharedCheck = await checkSharedFiles(project);
    results.push({
      ...pythonCheck,
      issues: [...pythonCheck.issues, ...sharedCheck.issues],
    });
  }

  // Check TypeScript projects
  for (const project of TYPESCRIPT_PROJECTS) {
    const tsCheck = await checkTypeScriptLayout(project);
    const sharedCheck = await checkSharedFiles(project);
    results.push({
      ...tsCheck,
      issues: [...tsCheck.issues, ...sharedCheck.issues],
    });
  }

  // Output results
  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
      const errors = result.issues.filter((i) => i.severity === "error");
      const warnings = result.issues.filter((i) => i.severity === "warning");
      totalErrors += errors.length;
      totalWarnings += warnings.length;

      if (result.issues.length === 0) {
        console.log(`✅ ${result.project} (${result.type})`);
      } else {
        console.log(`❌ ${result.project} (${result.type})`);
        for (const issue of result.issues) {
          const icon = issue.severity === "error" ? "  ❌" : "  ⚠️ ";
          console.log(`${icon} ${issue.type}: ${issue.message}`);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Summary: ${results.length} projects checked`);
    console.log(`Errors: ${totalErrors}, Warnings: ${totalWarnings}`);

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log("✅ All directory layouts are compliant!");
    } else if (totalErrors === 0) {
      console.log("⚠️  All layouts valid, but some warnings exist");
    } else {
      console.log("❌ Some projects need directory layout fixes");
    }

    if (checkMode && totalErrors > 0) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
