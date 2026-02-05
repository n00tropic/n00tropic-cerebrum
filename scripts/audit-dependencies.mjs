#!/usr/bin/env node
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { glob } from "glob";

async function main() {
	console.log("🔍 Auditing workspace dependencies...");

	// Find all package.json files, excluding node_modules
	const packageFiles = await glob("**/package.json", {
		ignore: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
		cwd: process.cwd(),
	});

	const depMap = new Map(); // dependency -> { version -> [packages] }

	for (const file of packageFiles) {
		try {
			const pkg = JSON.parse(readFileSync(file, "utf8"));
			const packageName = pkg.name || file;

			const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

			for (const [dep, version] of Object.entries(allDeps)) {
				if (!depMap.has(dep)) {
					depMap.set(dep, new Map());
				}
				const versionMap = depMap.get(dep);
				if (!versionMap.has(version)) {
					versionMap.set(version, []);
				}
				versionMap.get(version).push(packageName);
			}
		} catch (e) {
			console.warn(`Failed to parse ${file}: ${e.message}`);
		}
	}

	const mismatches = [];
	for (const [dep, versions] of depMap.entries()) {
		if (versions.size > 1) {
			mismatches.push({ dep, versions });
		}
	}

	// Sort by dependency name
	mismatches.sort((a, b) => a.dep.localeCompare(b.dep));

	let report = "# Dependency Mismatch Triage Log\n\n";
	report += `Generated at: ${new Date().toISOString()}\n\n`;

	if (mismatches.length === 0) {
		report += "✅ No dependency mismatches found across the workspace!\n";
	} else {
		report += `⚠️ Found ${mismatches.length} dependencies with divergent versions.\n\n`;

		for (const { dep, versions } of mismatches) {
			report += `### \`${dep}\`\n`;
			for (const [ver, pkgs] of versions.entries()) {
				report += `- **${ver}**: Used in ${pkgs.length} packages\n`;
				// Limit list if too long
				if (pkgs.length > 5) {
					report += `  - ${pkgs.slice(0, 5).join(", ")} ... (+${pkgs.length - 5} more)\n`;
				} else {
					report += `  - ${pkgs.join(", ")}\n`;
				}
			}
			report += "\n";
		}
	}

	const outputFile = "triage-log.md";
	writeFileSync(outputFile, report);
	console.log(`✅ Audit complete. Report written to ${outputFile}`);
}

main().catch(console.error);
