#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const workspace = path.join(ROOT, "pnpm-workspace.yaml");
const rootPkg = path.join(ROOT, "package.json");

if (!readFileSync(rootPkg, "utf-8").includes("n00tropic-cerebrum")) {
  console.error("[preflight-pnpm-deps] run from the n00tropic-cerebrum root");
  process.exit(1);
}

const globPatterns = readFileSync(workspace, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("- "))
  .map((line) => line.slice(2))
  .filter((line) => !line.startsWith("!"));

const pkgPaths = new Set();
for (const pattern of globPatterns) {
  const result = spawnSync("bash", ["-lc", `ls -1 ${pattern}`], {
    cwd: ROOT,
    encoding: "utf-8",
  });
  if (result.status !== 0) continue;
  result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const pkgJson = path.join(ROOT, entry, "package.json");
      pkgPaths.add(pkgJson);
    });
}

const allowlistEnv = (process.env.PREFLIGHT_ALLOWLIST || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const allowlistFile = process.env.PREFLIGHT_ALLOWLIST_FILE
  ? path.resolve(process.env.PREFLIGHT_ALLOWLIST_FILE)
  : null;
const allowlistFileEntries =
  allowlistFile && existsSync(allowlistFile)
    ? readFileSync(allowlistFile, "utf-8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
    : [];
const allowlist = new Set([...allowlistEnv, ...allowlistFileEntries]);

const skipScopes = (process.env.PREFLIGHT_SKIP_SCOPES || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const skipScoped = process.env.PREFLIGHT_SKIP_SCOPED === "1";

const missing = [];
for (const pkgPath of pkgPaths) {
  let data;
  try {
    data = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    continue;
  }
  const deps = {
    ...(data.dependencies || {}),
    ...(data.devDependencies || {}),
  };

  for (const [name, range] of Object.entries(deps)) {
    if (range.startsWith("workspace:")) continue;
    if (range.startsWith("file:")) continue;
    if (range.startsWith("link:")) continue;
    if (range.startsWith("git+")) continue;
    if (allowlist.has(name)) continue;
    if (skipScoped && name.startsWith("@")) continue;
    if (skipScopes.length > 0 && name.startsWith("@")) {
      const scope = name.split("/")[0].slice(1);
      if (skipScopes.includes(scope)) continue;
    }

    const result = spawnSync("pnpm", ["view", `${name}@${range}`, "version"], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });

    if (result.status !== 0) {
      missing.push({
        pkg: data.name || pkgPath,
        dep: name,
        range,
      });
    }
  }
}

if (missing.length > 0) {
  console.error(
    "[preflight-pnpm-deps] missing/unpublished dependencies found:",
  );
  for (const entry of missing) {
    console.error(`  ${entry.pkg}: ${entry.dep}@${entry.range}`);
  }
  process.exit(1);
}

console.log("[preflight-pnpm-deps] OK");
