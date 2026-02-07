#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { globSync } from "glob";

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
    console.warn(`[sync-storybook] Missing manifest at ${MANIFEST_PATH}`);
    return null;
  }
}

function detectIndent(content) {
  for (const line of content.split("\n")) {
    if (line.startsWith("\t")) return "\t";
    if (line.startsWith("  ")) return "  ";
  }
  return "  ";
}

function normalizeSpec(spec) {
  if (spec.startsWith("^") || spec.startsWith("~")) {
    return spec.slice(1);
  }
  if (/^\d+\.\d+\.\d+/.test(spec)) {
    return spec;
  }
  return null;
}

function desiredSpec(currentSpec, targetVersion) {
  if (currentSpec.startsWith("^") || currentSpec.startsWith("~")) {
    return `${currentSpec[0]}${targetVersion}`;
  }
  if (/^\d+\.\d+\.\d+/.test(currentSpec)) {
    return targetVersion;
  }
  return null;
}

function isStorybookDep(name) {
  return name === "storybook" || name.startsWith("@storybook/");
}

function getPackageFiles() {
  return globSync("**/package.json", {
    cwd: ROOT,
    nodir: true,
    ignore: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.pnpm/**",
      "**/.pnpm-store/**",
      "**/.venv/**",
      "**/.uv-cache/**",
      "**/.uv/**",
      "**/dist/**",
      "**/build/**",
      "**/artifacts/**",
      "**/.cache_local/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/.tmp/**",
      "**/tmp/**",
    ],
  }).map((file) => join(ROOT, file));
}

const manifest = loadManifest();
const storybookVersion =
  typeof manifest?.toolchains?.storybook === "string"
    ? manifest.toolchains.storybook
    : manifest?.toolchains?.storybook?.version;

if (!storybookVersion) {
  console.warn("[sync-storybook] No storybook version in manifest; skipping.");
  process.exit(0);
}

const packageFiles = getPackageFiles();
let mismatches = 0;

for (const filePath of packageFiles) {
  let content;
  let data;
  try {
    content = readFileSync(filePath, "utf8");
    data = JSON.parse(content);
  } catch {
    console.warn(`[sync-storybook] Skipping unreadable ${filePath}`);
    continue;
  }

  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  let changed = false;
  for (const section of sections) {
    const deps = data[section];
    if (!deps) continue;

    for (const [depName, depSpec] of Object.entries(deps)) {
      if (!isStorybookDep(depName)) continue;

      const currentSpec = String(depSpec);
      const normalized = normalizeSpec(currentSpec);
      const nextSpec = desiredSpec(currentSpec, storybookVersion);

      if (!normalized || !nextSpec) {
        mismatches += 1;
        console.warn(
          `[sync-storybook] Unrecognized version pattern in ${filePath} (${section}): ${depName}@${currentSpec}`,
        );
        continue;
      }

      if (normalized !== storybookVersion || currentSpec !== nextSpec) {
        mismatches += 1;
        if (!checkOnly && !dryRun) {
          deps[depName] = nextSpec;
          changed = true;
        } else {
          console.log(
            `[sync-storybook] ${filePath} (${section}) ${depName}@${currentSpec} -> ${nextSpec}`,
          );
        }
      }
    }
  }

  if (changed && !checkOnly && !dryRun) {
    const indent = detectIndent(content);
    writeFileSync(filePath, JSON.stringify(data, null, indent) + "\n");
  }
}

if (checkOnly && mismatches > 0) {
  console.error(`[sync-storybook] Found ${mismatches} mismatch(es).`);
  process.exit(1);
}

if (!checkOnly) {
  const verb = dryRun ? "Previewed" : "Synced";
  console.log(`[sync-storybook] ${verb} Storybook to ${storybookVersion}.`);
}
