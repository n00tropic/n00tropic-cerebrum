#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MANIFEST_PATH = join(
  ROOT,
  "platform",
  "n00-cortex",
  "data",
  "toolchain-manifest.json",
);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const dryRun = args.has("--dry-run");

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch (error) {
    console.warn(`[sync-ecmascript] Missing manifest at ${MANIFEST_PATH}`);
    return null;
  }
}

function formatLibs(libs) {
  return libs.map((lib) => `"${lib}"`).join(", ");
}

function extractLibs(content) {
  const match = content.match(/"lib"\s*:\s*\[([^\]]*)\]/s);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

const TARGETS = [
  { path: "tsconfig.base.json", libs: ["ESNext"] },
  { path: "platform/n00t/tsconfig.base.json", libs: ["ESNext"] },
  {
    path: "platform/n00plicate/toolchains/tsconfig.base.json",
    libs: ["ESNext", "DOM", "DOM.Iterable"],
  },
  {
    path: "platform/n00-cortex/tooling/tsconfig.ts7-base.json",
    libs: ["ESNext"],
  },
];

const manifest = loadManifest();
const ecmascriptTarget =
  typeof manifest?.toolchains?.ecmascript === "string"
    ? manifest.toolchains.ecmascript
    : manifest?.toolchains?.ecmascript?.version;

if (!ecmascriptTarget) {
  console.warn("[sync-ecmascript] No ecmascript target in manifest; skipping.");
  process.exit(0);
}

let mismatches = 0;

for (const target of TARGETS) {
  const filePath = join(ROOT, target.path);
  if (!existsSync(filePath)) {
    console.warn(`[sync-ecmascript] Missing ${target.path}`);
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  const targetMatch = content.match(/"target"\s*:\s*"([^"]+)"/);
  const currentTarget = targetMatch ? targetMatch[1] : null;
  const currentLibs = extractLibs(content);
  const expectedLibs = target.libs;
  const libsMatch =
    currentLibs.length === expectedLibs.length &&
    expectedLibs.every((lib, idx) => currentLibs[idx] === lib);

  const needsTarget = currentTarget !== ecmascriptTarget;
  const needsLibs = !libsMatch;

  if (needsTarget || needsLibs) {
    mismatches += 1;
  }

  if (checkOnly || dryRun) {
    if (needsTarget || needsLibs) {
      console.log(
        `[sync-ecmascript] ${target.path} target=${currentTarget} lib=[${currentLibs.join(
          ", ",
        )}] -> target=${ecmascriptTarget} lib=[${expectedLibs.join(", ")}]`,
      );
    }
    continue;
  }

  if (needsTarget || needsLibs) {
    let next = content;
    next = next.replace(
      /(^\s*"target"\s*:\s*)"[^"]+"/m,
      `$1"${ecmascriptTarget}"`,
    );
    next = next.replace(
      /(^\s*"lib"\s*:\s*)\[[^\]]*\]/m,
      `$1[${formatLibs(expectedLibs)}]`,
    );
    writeFileSync(filePath, next);
  }
}

if (checkOnly && mismatches > 0) {
  console.error(`[sync-ecmascript] Found ${mismatches} mismatch(es).`);
  process.exit(1);
}

if (!checkOnly) {
  const verb = dryRun ? "Previewed" : "Synced";
  console.log(
    `[sync-ecmascript] ${verb} ECMAScript target to ${ecmascriptTarget}.`,
  );
}
