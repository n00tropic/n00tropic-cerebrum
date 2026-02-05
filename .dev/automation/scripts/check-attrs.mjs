#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { glob } from "glob";

const ARGS = process.argv.slice(2);
const TARGET =
	ARGS[0] && !ARGS[0].startsWith("-")
		? ARGS[0]
		: "docs/modules/**/pages/**/*.adoc";
const fix = ARGS.includes("--fix");
const defaultTagArg = ARGS.find((a) => a.startsWith("--default-tags="));
const defaultTags = defaultTagArg ? defaultTagArg.split("=")[1] : "docs";
const defaultReviewedArg = ARGS.find((a) => a.startsWith("--reviewed="));
const defaultReviewed = defaultReviewedArg
	? defaultReviewedArg.split("=")[1]
	: new Date().toISOString().slice(0, 10);

console.log(`[check-attrs] Scanning ${TARGET}`);
const files = await glob(TARGET);
let failed = false,
	now = new Date();

if (files.length === 0) {
	console.log(`[check-attrs] No files found matching ${TARGET}`);
}

for (const f of files) {
	const s = readFileSync(f, "utf8");
	const hasTags = /^:page-tags:\s?.+/m.test(s);
	const m = /^:reviewed:\s?(\d{4}-\d{2}-\d{2})/m.exec(s);
	if (!hasTags) {
		console.error(`Missing :page-tags: -> ${f}`);
		if (fix) {
			console.error(`Fixing :page-tags: for ${f}`);
			const patched = `:page-tags: ${defaultTags}\n\n${s}`;
			writeFileSync(f, patched, "utf8");
			console.error(`Patched :page-tags: -> ${f}`);
		} else {
			failed = true;
		}
	}
	if (!m) {
		console.error(`Missing :reviewed: -> ${f}`);
		if (fix) {
			console.error(`Fixing :reviewed: for ${f}`);
			const patched = `:reviewed: ${defaultReviewed}\n\n${s}`;
			writeFileSync(f, patched, "utf8");
			console.error(`Patched :reviewed: -> ${f}`);
		} else {
			failed = true;
		}
	} else {
		const dt = new Date(m[1]);
		const age = (now - dt) / (1000 * 60 * 60 * 24);
		if (age > 90) {
			console.error(`Stale :reviewed: (${m[1]}) -> ${f}`);
			failed = true;
		}
	}
}

if (failed) process.exit(1);
