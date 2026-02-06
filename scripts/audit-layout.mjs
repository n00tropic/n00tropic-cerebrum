import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

const ROOT = path.resolve(process.cwd());
const PLATFORM_DIR = path.join(ROOT, "platform");

const REQUIRED_FILES = [
  "README.md",
  "CONTRIBUTING.md",
  "GOLDEN_PATH.md",
  "AGENTS.md",
  "package.json",
];

const REQUIRED_DIRS = [
  "scripts",
  "tests", // or equivalent standard test dir
];

const REQUIRED_SCRIPTS = ["build", "test", "lint", "format", "dev"];

const REQUIRED_ENGINES = {
  node: ">=24.1.0",
  pnpm: ">=10.28.2",
};

console.log(chalk.blue("🔍 Auditing platform repository layouts..."));

if (!fs.existsSync(PLATFORM_DIR)) {
  console.error(chalk.red("❌ platform/ directory not found."));
  process.exit(1);
}

const entries = fs.readdirSync(PLATFORM_DIR, { withFileTypes: true });
let hasErrors = false;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  // Skip if it's not a managed repo (e.g. might be a leftover dir, but we should probably check everything in platform/)
  const repoPath = path.join(PLATFORM_DIR, entry.name);
  const relativePath = path.relative(ROOT, repoPath);

  console.log(chalk.cyan(`\nChecking ${relativePath}...`));
  let repoErrors = [];

  // 1. Check Files
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(repoPath, file))) {
      repoErrors.push(`Missing file: ${file}`);
    }
  }

  // 2. Check Directories
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(repoPath, dir))) {
      repoErrors.push(`Missing directory: ${dir}/`);
    }
  }

  // 3. Check package.json (Scripts & Engines)
  const pkgPath = path.join(repoPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

      // Check Scripts
      for (const script of REQUIRED_SCRIPTS) {
        if (!pkg.scripts || !pkg.scripts[script]) {
          repoErrors.push(`Missing script: "${script}"`);
        }
      }

      // Check Engines
      if (!pkg.engines) {
        repoErrors.push(`Missing "engines" field in package.json`);
      } else {
        if (pkg.engines.node !== REQUIRED_ENGINES.node) {
          repoErrors.push(
            `Incorrect node engine: "${pkg.engines.node}" (expected "${REQUIRED_ENGINES.node}")`,
          );
        }
        if (pkg.engines.pnpm !== REQUIRED_ENGINES.pnpm) {
          repoErrors.push(
            `Incorrect pnpm engine: "${pkg.engines.pnpm}" (expected "${REQUIRED_ENGINES.pnpm}")`,
          );
        }
      }
    } catch (e) {
      repoErrors.push(`Invalid package.json: ${e.message}`);
    }
  }

  if (repoErrors.length > 0) {
    hasErrors = true;
    repoErrors.forEach((err) => console.log(chalk.red(`  ❌ ${err}`)));
  } else {
    console.log(chalk.green(`  ✅ OK`));
  }
}

if (hasErrors) {
  console.log(chalk.yellow("\n⚠️  Audit completed with errors."));
  process.exit(1);
} else {
  console.log(
    chalk.green(
      "\n✅ Audit completed successfully. All layouts match standards.",
    ),
  );
}
