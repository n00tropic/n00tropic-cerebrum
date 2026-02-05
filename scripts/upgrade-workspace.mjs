#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function log(msg) {
	console.log(`\n\x1b[34m[upgrade-workspace]\x1b[0m ${msg}`);
}

function run(cmd, args, options = {}) {
	const cwd = options.cwd || ROOT;
	const env = options.env ? { ...process.env, ...options.env } : process.env;

	console.log(`\x1b[90m$ ${cmd} ${args.join(" ")}\x1b[0m`);
	const result = spawnSync(cmd, args, {
		stdio: "inherit",
		cwd,
		env,
		encoding: "utf-8",
	});
	if (result.status !== 0) {
		console.error(
			`\x1b[31mCommand failed with exit code ${result.status}\x1b[0m`,
		);
		// Optional: throw new Error('Command failed');
		process.exit(1);
	}
}

async function main() {
	log("Starting full workspace upgrade...");

	// 1. Sync Node Version
	log("Phase 1: Syncing Node.js versions...");
	if (existsSync(join(ROOT, "scripts/sync-node-version.sh"))) {
		run("bash", ["scripts/sync-node-version.sh"]);
	} else {
		console.warn("scripts/sync-node-version.sh not found, skipping.");
	}

	// 2. Recursive Dependency Update
	log("Phase 2: Updating NPM dependencies recursively...");
	// Interactive mode might be too much for automation, defaulting to --latest
	// Using -i (interactive) if run manually, but for script we use automated
	run("pnpm", ["update", "-r", "--latest"], {
		env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" },
	});

	// 3. Container Upgrades
	log("Phase 3: Upgrading Container Images...");

	// 3a. Penpot
	const penpotScript = join(
		ROOT,
		"n00plicate/scripts/update-penpot-images.mjs",
	);
	if (existsSync(penpotScript)) {
		log("Upgrading Penpot images...");
		run("node", [penpotScript]);
	}

	// 3b. ERPNext
	const erpComposeDir = join(
		ROOT,
		"n00tropic_HQ/12-Platform-Ops/erpnext-docker",
	);
	if (existsSync(erpComposeDir)) {
		log("Pulling latest ERPNext images...");
		run("docker", ["compose", "pull"], { cwd: erpComposeDir });
	}

	// 4. Re-install and Build
	log("Phase 4: Re-installing and Verifying Build...");
	run("pnpm", ["install"], { env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" } });
	run("pnpm", ["run", "build:ordered"]);

	// 5. Final Health Check
	log("Phase 5: Final Health Check...");
	if (existsSync(join(ROOT, "scripts/health-check.mjs"))) {
		run("node", ["scripts/health-check.mjs"]);
	}

	log("✅ Workspace upgrade complete!");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
