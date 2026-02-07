#!/usr/bin/env node
/**
 * Guardrail to keep Node/TypeScript/ECMAScript baselines in sync across subrepos/templates.
 *
 * What it checks:
 * - n00menon tsconfig extends @tsconfig/node<MAJOR>/tsconfig.json.
 * - n00-frontiers node-service template uses major-only @tsconfig reference.
 * - Node baseline values in cookiecutter.json, manifest.{json,yaml}, and README table
 *   match the expected version.
 *
 * Update platform/n00-cortex/data/toolchain-manifest.json when bumping Node/TS/ECMA; run `pnpm run tsconfig:check`.
 */

import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const repoRoot = path.resolve(
  path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)),
  "..",
);

const manifestPath = path.join(
  repoRoot,
  "platform",
  "n00-cortex",
  "data",
  "toolchain-manifest.json",
);

let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (err) {
  console.warn("[tsconfig-check] Missing toolchain manifest; using defaults.");
}

const expectedNodeVersion = manifest?.toolchains?.node?.version || "24.11.0";
const expectedNodeMajor = expectedNodeVersion.split(".")[0];
const expectedTypescriptVersion =
  typeof manifest?.toolchains?.typescript === "string"
    ? manifest.toolchains.typescript
    : manifest?.toolchains?.typescript?.version;
const expectedEcmascriptTarget =
  typeof manifest?.toolchains?.ecmascript === "string"
    ? manifest.toolchains.ecmascript
    : manifest?.toolchains?.ecmascript?.version;

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

const checks = [
  {
    file: "platform/n00menon/tsconfig.json",
    test: (s) =>
      s.includes(
        `"extends": "@tsconfig/node${expectedNodeMajor}/tsconfig.json"`,
      ),
    message: `n00menon/tsconfig.json should extend @tsconfig/node${expectedNodeMajor}/tsconfig.json`,
  },
  {
    file: "platform/n00-frontiers/applications/scaffolder/templates/node-service/{{cookiecutter.project_slug}}/tsconfig.json",
    test: (s) =>
      /@tsconfig\/node\{\{\s*cookiecutter\.node_version\.split\('\.'\)\[0\]\s*\}\}\/tsconfig\.json/.test(
        s,
      ),
    message:
      "node-service template tsconfig should reference @tsconfig/node<major>/tsconfig.json using cookiecutter.node_version.split()[0]",
  },
  {
    file: "platform/n00-frontiers/applications/scaffolder/templates/node-service/cookiecutter.json",
    test: (s) => JSON.parse(s).node_version === expectedNodeVersion,
    message: `cookiecutter.json node_version should be ${expectedNodeVersion}`,
  },
  {
    file: "platform/n00-frontiers/applications/scaffolder/templates/manifest.json",
    test: (s) => {
      const data = JSON.parse(s);
      return (
        data.templates?.["node-service"]?.sample_contexts?.default
          ?.node_version === expectedNodeVersion
      );
    },
    message: `manifest.json node-service sample_contexts.default.node_version should be ${expectedNodeVersion}`,
  },
  {
    file: "platform/n00-frontiers/applications/scaffolder/templates/manifest.yaml",
    test: (s) =>
      new RegExp(`node_version:\\s*"?${expectedNodeVersion}"?`).test(s),
    message: `manifest.yaml node_version should be ${expectedNodeVersion}`,
  },
  {
    file: "platform/n00-frontiers/applications/scaffolder/templates/node-service/README.md",
    test: (s) =>
      s.includes(
        `| \`node_version\`          | 24                           | ${expectedNodeVersion}`,
      ),
    message: `node-service README table should list node_version ${expectedNodeVersion} as default`,
  },
];

function extractLibs(content) {
  const match = content.match(/"lib"\s*:\s*\[([^\]]*)\]/s);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((entry) => entry.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

function checkTsconfigTarget(file, expectedTarget, expectedLibs) {
  try {
    const content = read(file);
    const targetMatch = content.match(/"target"\s*:\s*"([^"]+)"/);
    const currentTarget = targetMatch ? targetMatch[1] : null;
    const currentLibs = extractLibs(content);
    const libsMatch =
      currentLibs.length === expectedLibs.length &&
      expectedLibs.every((lib, idx) => currentLibs[idx] === lib);

    if (currentTarget !== expectedTarget || !libsMatch) {
      failures++;
      console.error(
        `✖ ${file} should use target ${expectedTarget} and lib [${expectedLibs.join(
          ", ",
        )}] (found target=${currentTarget} lib=[${currentLibs.join(", ")}])`,
      );
    }
  } catch (err) {
    failures++;
    console.error(`✖ Failed to read ${file}: ${err.message}`);
  }
}

function normalizeVersionSpec(spec) {
  if (spec.startsWith("^") || spec.startsWith("~")) {
    return spec.slice(1);
  }
  if (/^\d+\.\d+\.\d+/.test(spec)) {
    return spec;
  }
  return null;
}

function checkTypescriptVersions(expectedVersion) {
  if (!expectedVersion) return;

  const packageFiles = globSync("**/package.json", {
    cwd: repoRoot,
    nodir: true,
    ignore: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.pnpm/**",
      "**/.pnpm-store/**",
      "**/.venv/**",
      "**/dist/**",
      "**/build/**",
      "**/artifacts/**",
    ],
  });

  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const relPath of packageFiles) {
    const absPath = path.join(repoRoot, relPath);
    try {
      const data = JSON.parse(fs.readFileSync(absPath, "utf8"));
      for (const section of sections) {
        const deps = data[section];
        if (!deps || !deps.typescript) continue;
        const current = String(deps.typescript);
        const normalized = normalizeVersionSpec(current);
        if (!normalized || normalized !== expectedVersion) {
          failures++;
          console.error(
            `✖ ${relPath} (${section}) typescript should be ${expectedVersion} (found ${current})`,
          );
        }
      }
    } catch (err) {
      failures++;
      console.error(`✖ Failed to read ${relPath}: ${err.message}`);
    }
  }
}

let failures = 0;
for (const check of checks) {
  try {
    const content = read(check.file);
    if (!check.test(content)) {
      failures++;
      console.error(`✖ ${check.message}`);
    }
  } catch (err) {
    failures++;
    console.error(`✖ Failed to read ${check.file}: ${err.message}`);
  }
}

if (expectedEcmascriptTarget) {
  checkTsconfigTarget("tsconfig.base.json", expectedEcmascriptTarget, [
    expectedEcmascriptTarget,
  ]);
  checkTsconfigTarget(
    "platform/n00t/tsconfig.base.json",
    expectedEcmascriptTarget,
    [expectedEcmascriptTarget],
  );
  checkTsconfigTarget(
    "platform/n00plicate/toolchains/tsconfig.base.json",
    expectedEcmascriptTarget,
    [expectedEcmascriptTarget, "DOM", "DOM.Iterable"],
  );
  checkTsconfigTarget(
    "platform/n00-cortex/tooling/tsconfig.ts7-base.json",
    expectedEcmascriptTarget,
    [expectedEcmascriptTarget],
  );
}

checkTypescriptVersions(expectedTypescriptVersion);

if (failures > 0) {
  console.error(`\nFound ${failures} configuration drift issue(s).`);
  process.exit(1);
} else {
  console.log("✓ Compiler baselines look consistent.");
}
