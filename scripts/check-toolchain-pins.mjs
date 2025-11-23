#!/usr/bin/env node
// Verify that Node (.nvmrc) and pnpm pins match the canonical toolchain manifest
// and that subrepos agree with the workspace versions.
import fs from "node:fs";
import path from "node:path";
import { log } from "./lib/log.mjs";
import { notifyDiscord } from "./lib/notify-discord.mjs";

const root = process.cwd();
const manifestPath = path.join(
	root,
	"n00-cortex",
	"data",
	"toolchain-manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedNode = (manifest.toolchains?.node?.version || "").trim();
const expectedPnpm = (manifest.toolchains?.pnpm?.version || "").trim();
const webhook = process.env.DISCORD_WEBHOOK;

const rootNvmrc = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const issues = [];
if (rootNvmrc !== expectedNode) {
	issues.push(`root .nvmrc (${rootNvmrc}) != manifest node (${expectedNode})`);
}

function readPackageManager(pkgPath) {
	if (!fs.existsSync(pkgPath)) return null;
	try {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
		return pkg.packageManager || null;
	} catch (_e) {
		return null;
	}
}

function parsePnpmVersion(pkgMgr) {
	if (!pkgMgr) return null;
	const match = pkgMgr.match(/pnpm@(.*)$/);
	return match ? match[1] : null;
}

const paths = ["."]; // include workspace root
// add submodules from .gitmodules
const gitmodules = path.join(root, ".gitmodules");
if (fs.existsSync(gitmodules)) {
	const content = fs.readFileSync(gitmodules, "utf8");
	for (const line of content.split(/\r?\n/)) {
		const m = line.match(/^\s*path\s*=\s*(.+)$/);
		if (m) paths.push(m[1].trim());
	}
}

for (const p of paths) {
	const pkgPath = path.join(root, p, "package.json");
	const pkgMgr = readPackageManager(pkgPath);
	const pnpmVersion = parsePnpmVersion(pkgMgr);
	if (pkgMgr && !pnpmVersion) {
		issues.push(
			`${p || "workspace root"} packageManager is not pnpm: ${pkgMgr}`,
		);
	}
	if (pnpmVersion && pnpmVersion !== expectedPnpm) {
		issues.push(
			`${p || "workspace root"} packageManager pnpm@${pnpmVersion} != ${expectedPnpm}`,
		);
	}
	const nvmPath = path.join(root, p, ".nvmrc");
	if (fs.existsSync(nvmPath)) {
		const val = fs.readFileSync(nvmPath, "utf8").trim();
		if (val !== expectedNode) {
			issues.push(`${p || "workspace root"} .nvmrc ${val} != ${expectedNode}`);
		}
	}
}

const failed = issues.length > 0;
if (failed) {
	log("error", "Toolchain pin mismatches detected", { issues });
} else {
	log("info", `Toolchain pins OK (Node ${expectedNode}, pnpm ${expectedPnpm})`, {
		node: expectedNode,
		pnpm: expectedPnpm,
	});
}

if (webhook) {
	const desc = failed ? issues.join("\n") : `Node ${expectedNode}, pnpm ${expectedPnpm}`;
	await notifyDiscord({
		webhook,
		title: failed ? "❌ Toolchain pin check failed" : "✅ Toolchain pins ok",
		description: desc,
		color: failed ? 15158332 : 3066993,
	});
}

if (failed) process.exit(1);
