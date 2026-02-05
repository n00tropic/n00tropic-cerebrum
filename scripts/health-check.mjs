#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const REPOS = [];
try {
	const gitmodules = readFileSync(join(ROOT, ".gitmodules"), "utf8");
	const matches = gitmodules.matchAll(/path = (.+)/g);
	for (const match of matches) {
		REPOS.push(match[1].trim());
	}
} catch {
	// Fallback or just empty if no gitmodules
}

let expectedNode = null;
let expectedPnpm = null;

try {
	const manifestPath = join(ROOT, "n00-cortex/data/toolchain-manifest.json");
	if (existsSync(manifestPath)) {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		expectedNode = manifest.toolchains?.node?.version?.trim();
		expectedPnpm = manifest.toolchains?.pnpm?.version?.trim();
	}
} catch {
	// Ignore manifest read errors for now, allow partial checks
}

let hasErrors = false;

function log(status, msg) {
	const color =
		status === "ok"
			? "\x1b[32m✔"
			: status === "warn"
				? "\x1b[33m⚠"
				: "\x1b[31m✘";
	console.log(`${color} ${msg}\x1b[0m`);
	if (status === "error") hasErrors = true;
}

function checkNodeVersion() {
	const systemNode = process.version;
	let targetNode = expectedNode || "v25.x"; // Prefer manifest, fallback to hardcoded

	if (!expectedNode) {
		try {
			targetNode = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
		} catch {
			/* ignore */
		}
	}

	const cleanSystem = systemNode.replace(/^v/, "");
	const cleanTarget = targetNode.replace(/^v/, "");

	if (cleanSystem.startsWith(cleanTarget)) {
		log(
			"ok",
			`Node version matches requirement: ${systemNode} (Target: ${targetNode})`,
		);
	} else {
		log(
			"error",
			`Node version mismatch: Active ${systemNode} != Target ${targetNode}`,
		);
	}
}

function checkPnpmLockfile() {
	if (existsSync(join(ROOT, "pnpm-lock.yaml"))) {
		log("ok", "Root pnpm-lock.yaml exists");
	} else {
		log("error", "Missing root pnpm-lock.yaml");
	}

	const subReposWithLocks = REPOS.filter((repo) =>
		existsSync(join(ROOT, repo, "pnpm-lock.yaml")),
	);
	if (subReposWithLocks.length > 0) {
		log(
			"warn",
			`Found redundant lockfiles in subrepos (should use workspace root): ${subReposWithLocks.join(", ")}`,
		);
		// Not a fatal error, but strongly discouraged
	} else {
		log("ok", "No redundant subrepo lockfiles found");
	}
}

function checkSubmodules() {
	const missing = REPOS.filter((repo) => !existsSync(join(ROOT, repo, ".git")));
	if (missing.length > 0) {
		log("error", `Missing initialized submodules: ${missing.join(", ")}`);
	} else {
		log("ok", "All core submodules initialized");
	}

	// Check branch status (fast)
	try {
		const status = execSync("git submodule status", {
			cwd: ROOT,
			encoding: "utf8",
		});
		const detached = status
			.split("\n")
			.filter((l) => l.startsWith("+") || l.startsWith("-"))
			.map((l) => l.split(" ")[1]);
		if (detached.length > 0) {
			log(
				"warn",
				`Submodules with modifications or detached/unsynced commits: ${detached.join(", ")}`,
			);
		} else {
			log("ok", "Submodules are clean and synced");
		}
	} catch (e) {
		log("warn", "Failed to check submodule git status");
	}
}

function checkPackageManager() {
	try {
		const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
		const pm = pkg.packageManager;
		const targetPm = expectedPnpm ? `pnpm@${expectedPnpm}` : "pnpm@10";

		if (pm && pm.startsWith(targetPm)) {
			log("ok", `Root uses expected packageManager: ${pm}`);
		} else {
			// Allow fuzzy match if just major version
			if (pm && pm.startsWith("pnpm@10") && !expectedPnpm) {
				log("ok", `Root uses expected packageManager: ${pm}`);
			} else {
				log(
					"error",
					`Unexpected packageManager in root: ${pm || "undefined"} (Expected ${targetPm})`,
				);
			}
		}
	} catch {
		log("error", "Failed to read root package.json");
	}
}

function main() {
	console.log("\n🏥 \x1b[1mWorkspace Health Check\x1b[0m\n");

	checkNodeVersion();
	checkPackageManager();
	checkPnpmLockfile();
	checkSubmodules();

	console.log();
	if (hasErrors) {
		console.error(
			"\x1b[31mHealth Check Failed. Please fix errors above.\x1b[0m",
		);
		process.exit(1);
	} else {
		console.log("\x1b[32mWorkspace Healthy! 🚀\x1b[0m");
	}
}

main();
