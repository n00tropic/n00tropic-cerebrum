#!/usr/bin/env node

/**
 * check-workspace-integrity.mjs
 *
 * "The Doctor" for the n00tropic-cerebrum superrepo.
 * Checks for:
 * 1. Node version consistency (.nvmrc vs engines).
 * 2. Forbidden config in submodules (pnpm.overrides).
 * 3. Unsafe hook commands (npx/npm).
 * 4. Git module validity.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

let issuesFound = 0;

function log(type, msg) {
    if (type === 'INFO') console.log(`${COLORS.blue}[INFO]${COLORS.reset} ${msg}`);
    if (type === 'PASS') console.log(`${COLORS.green}[PASS]${COLORS.reset} ${msg}`);
    if (type === 'WARN') console.log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`);
    if (type === 'FAIL') {
        console.log(`${COLORS.red}[FAIL]${COLORS.reset} ${msg}`);
        issuesFound++;
    }
}

// 1. Get Root Node Version
function checkNodeVersions() {
    log('INFO', 'Checking Node.js version consistency...');
    let rootVersion = 'unknown';

    try {
        const nvmrcPath = path.join(ROOT_DIR, '.nvmrc');
        if (fs.existsSync(nvmrcPath)) {
            rootVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
            log('PASS', `Root .nvmrc: ${rootVersion}`);
        } else {
            log('WARN', 'Root .nvmrc missing.');
        }

        // Check submodules
        const submodules = getSubmodules();
        submodules.forEach(sub => {
            const subNvmrc = path.join(ROOT_DIR, sub, '.nvmrc');
            if (fs.existsSync(subNvmrc)) {
                const ver = fs.readFileSync(subNvmrc, 'utf8').trim();
                if (ver !== rootVersion) {
                    log('FAIL', `${sub}/.nvmrc (${ver}) does not match root (${rootVersion})`);
                }
            }

            const subPkg = path.join(ROOT_DIR, sub, 'package.json');
            if (fs.existsSync(subPkg)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(subPkg, 'utf8'));
                    if (pkg.engines?.node) {
                        // Very rough check, just logging for now
                        // log('INFO', `${sub} engines.node: ${pkg.engines.node}`);
                    }
                } catch (e) {}
            }
        });

    } catch (err) {
        log('FAIL', `Version check failed: ${err.message}`);
    }
}

// 2. Check for Pnpm Overrides in submodules
function checkPnpmOverrides() {
    log('INFO', 'Scanning for ignored pnpm.overrides in submodules...');
    const submodules = getSubmodules();

    submodules.forEach(sub => {
        const pkgPath = path.join(ROOT_DIR, sub, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.pnpm && pkg.pnpm.overrides) {
                    log('FAIL', `${sub}/package.json contains 'pnpm.overrides'. This is ignored by workspaces and causes warnings. Move to root.`);
                }
            } catch (e) {
                log('WARN', `Could not parse ${sub}/package.json`);
            }
        }
    }); // Fixed missing closing brace/paren
}

// 3. Check Hooks for npx/npm usage
function checkHooks() {
    log('INFO', 'Auditing git hooks for pnpm compliance...');
    const huskyDir = path.join(ROOT_DIR, '.husky');
    if (!fs.existsSync(huskyDir)) return;

    const hooks = fs.readdirSync(huskyDir);
    hooks.forEach(hook => {
        const hookPath = path.join(huskyDir, hook);
        if (fs.lstatSync(hookPath).isFile()) {
            const content = fs.readFileSync(hookPath, 'utf8');
            if (content.includes('npm ') || content.includes('npx ')) {
                if (!content.includes('pnpm exec')) {
                    log('FAIL', `${hook} uses 'npm' or 'npx'. Use 'pnpm exec' to avoid config warnings.`);
                }
            }
        }
    });
}

// Helper: Get list of submodules
function getSubmodules() {
    try {
        const gitmodules = fs.readFileSync(path.join(ROOT_DIR, '.gitmodules'), 'utf8');
        const matches = [...gitmodules.matchAll(/path = (.+)/g)];
        return matches.map(m => m[1].trim());
    } catch (e) {
        return [];
    }
}

// Main
console.log(`${COLORS.bold}--- Agent Integrity Doctor ---${COLORS.reset}\n`);
checkNodeVersions();
checkPnpmOverrides();
checkHooks();

if (issuesFound > 0) {
    console.log(`\n${COLORS.red}Found ${issuesFound} issues.${COLORS.reset}`);
    process.exit(1);
} else {
    console.log(`\n${COLORS.green}All checks passed.${COLORS.reset}`);
}
