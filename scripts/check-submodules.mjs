import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';

const ROOT = path.resolve(process.cwd());
const PLATFORM_DIR = path.join(ROOT, 'platform');

function run(cmd, cwd = ROOT) {
    try {
        return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
        return null; // Return null on failure
    }
}

console.log(chalk.blue('🔍 Checking submodules in platform/ directory...'));

if (!fs.existsSync(PLATFORM_DIR)) {
    console.error(chalk.red('❌ platform/ directory not found.'));
    process.exit(1);
}

const entries = fs.readdirSync(PLATFORM_DIR, { withFileTypes: true });
let hasErrors = false;

for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const submodulePath = path.join(PLATFORM_DIR, entry.name);
    const relativePath = path.relative(ROOT, submodulePath);

    // Check if it's a git repo
    if (!fs.existsSync(path.join(submodulePath, '.git'))) {
        console.warn(chalk.yellow(`⚠️  ${relativePath} is not a git repository (or .git is missing).`));
        // Not necessarily an error if it's just a folder, but suspicious for platform/
        continue;
    }

    // Check status
    const status = run('git status --porcelain', submodulePath);
    if (status) {
        console.error(chalk.red(`❌ ${relativePath} has uncommitted changes:`));
        console.error(chalk.dim(status));
        hasErrors = true;
    }

    // Check for detached head (unless it's a specific tag, but usually we want main/branch)
    const branch = run('git symbolic-ref --short HEAD', submodulePath);
    if (!branch) {
        // Detached HEAD
        const tag = run('git describe --tags --exact-match', submodulePath);
        if (tag) {
             console.log(chalk.cyan(`ℹ️  ${relativePath} is on tag: ${tag}`));
        } else {
             const sha = run('git rev-parse --short HEAD', submodulePath);
             console.warn(chalk.yellow(`⚠️  ${relativePath} is in detached HEAD state (${sha}).`));
        }
    } else {
        // On a branch
        // Check if behind remote
        run('git fetch', submodulePath);
        const behind = run(`git rev-list --count ${branch}..origin/${branch}`, submodulePath);
        const ahead = run(`git rev-list --count origin/${branch}..${branch}`, submodulePath);

        if (behind && parseInt(behind) > 0) {
             console.warn(chalk.yellow(`⚠️  ${relativePath} is behind origin/${branch} by ${behind} commits.`));
        }
        if (ahead && parseInt(ahead) > 0) {
             console.log(chalk.cyan(`ℹ️  ${relativePath} is ahead of origin/${branch} by ${ahead} commits.`));
        }
    }
}

if (hasErrors) {
    console.error(chalk.red('\n❌ Submodule check failed. Please fix dirty commits before proceeding.'));
    process.exit(1);
} else {
    console.log(chalk.green('\n✅ All submodules matches expectations.'));
}
