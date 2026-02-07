#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const args = new Set(process.argv.slice(2));
const flags = {
  withApproveBuilds: args.has("--with-approve-builds"),
  withPrune: args.has("--with-prune"),
  skipNodeSync: args.has("--skip-node-sync"),
  skipCompilerSync: args.has("--skip-compiler-sync"),
  skipDeps: args.has("--skip-deps"),
  skipContainers: args.has("--skip-containers"),
  skipVenvs: args.has("--skip-venvs"),
  skipBuild: args.has("--skip-build"),
  skipHealth: args.has("--skip-health"),
};

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

function hasCommand(cmd) {
  const result = spawnSync(cmd, ["--version"], {
    stdio: "ignore",
    encoding: "utf-8",
  });
  return result.status === 0;
}

function getLatestNpmVersion(pkg) {
  const result = spawnSync("pnpm", ["view", pkg, "version"], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    return null;
  }
  return String(result.stdout || "").trim();
}

async function main() {
  log("Starting full workspace upgrade...");

  // 0. Optional pnpm prep
  if (flags.withApproveBuilds || flags.withPrune) {
    log("Phase 0: Running optional pnpm prep...");
    if (hasCommand("pnpm")) {
      if (flags.withApproveBuilds) {
        run("pnpm", ["approve-builds"]);
      }
      if (flags.withPrune) {
        run("pnpm", ["prune"]);
      }
    } else {
      console.warn("pnpm not available; skipping approve/prune.");
    }
  }

  // 1. Sync Node Version
  if (!flags.skipNodeSync) {
    log("Phase 1: Syncing Node.js versions...");
    if (existsSync(join(ROOT, "scripts/sync-node-version.sh"))) {
      run("bash", ["scripts/sync-node-version.sh", "--from-system"]);
    } else {
      console.warn("scripts/sync-node-version.sh not found, skipping.");
    }
  } else {
    log("Phase 1: Skipping Node.js sync (--skip-node-sync)");
  }

  // 1b. Sync compiler/toolchain baselines
  if (!flags.skipCompilerSync) {
    log("Phase 1b: Syncing compiler baselines...");
    if (hasCommand("pnpm")) {
      const latestTs = getLatestNpmVersion("typescript");
      const latestStorybook = getLatestNpmVersion("storybook");
      if (latestTs) {
        run("node", [
          "scripts/update-toolchain.mjs",
          "typescript",
          latestTs,
          "--propagate",
        ]);
        run("node", ["scripts/sync-typescript-version.mjs"]);
      } else {
        console.warn("pnpm view typescript failed; skipping TS bump.");
      }

      if (latestStorybook) {
        run("node", [
          "scripts/update-toolchain.mjs",
          "storybook",
          latestStorybook,
          "--propagate",
        ]);
        run("node", ["scripts/sync-storybook-version.mjs"]);
      } else {
        console.warn("pnpm view storybook failed; skipping Storybook bump.");
      }
    } else {
      console.warn("pnpm not available; skipping compiler sync.");
    }

    if (existsSync(join(ROOT, "scripts/sync-ecmascript-target.mjs"))) {
      run("node", ["scripts/sync-ecmascript-target.mjs"]);
    }
  } else {
    log("Phase 1b: Skipping compiler sync (--skip-compiler-sync)");
  }

  // 2. Recursive Dependency Update
  if (!flags.skipDeps) {
    log("Phase 2: Updating NPM dependencies recursively...");
    if (existsSync(join(ROOT, "scripts/pnpm-install-safe.sh"))) {
      run("bash", ["scripts/pnpm-install-safe.sh", "update"], {
        env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" },
      });
    } else if (hasCommand("pnpm")) {
      // Interactive mode might be too much for automation, defaulting to --latest
      run("pnpm", ["update", "-r", "--latest"], {
        env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" },
      });
    } else {
      console.warn("pnpm not available; skipping dependency update.");
    }
  } else {
    log("Phase 2: Skipping dependency updates (--skip-deps)");
  }

  // 3. Container Upgrades
  if (!flags.skipContainers) {
    log("Phase 3: Upgrading Container Images...");

    // 3a. Penpot
    const penpotScript = join(
      ROOT,
      "platform/n00plicate/scripts/update-penpot-images.mjs",
    );
    if (existsSync(penpotScript)) {
      log("Upgrading Penpot images...");
      run("node", [penpotScript]);
    }

    // 3b. ERPNext
    const erpComposeDir = join(
      ROOT,
      "platform/n00tropic_HQ/12-Platform-Ops/erpnext-docker",
    );
    if (existsSync(erpComposeDir)) {
      log("Pulling latest ERPNext images...");
      run("docker", ["compose", "pull"], { cwd: erpComposeDir });
    }
  } else {
    log("Phase 3: Skipping container upgrades (--skip-containers)");
  }

  // 3c. Sync Python Virtual Environments
  if (!flags.skipVenvs) {
    log("Phase 3c: Syncing Python Virtual Environments...");
    const syncVenvsScript = join(ROOT, "scripts/sync-venvs.py");
    if (existsSync(syncVenvsScript)) {
      log("Provisioning uv environments...");
      run("python3", [syncVenvsScript, "--all", "--mode", "install"]);
    } else {
      console.warn("scripts/sync-venvs.py not found, skipping.");
    }
  } else {
    log("Phase 3c: Skipping venv sync (--skip-venvs)");
  }

  // 4. Re-install and Build
  if (!flags.skipBuild) {
    log("Phase 4: Re-installing and Verifying Build...");
    if (existsSync(join(ROOT, "scripts/pnpm-install-safe.sh"))) {
      run("bash", ["scripts/pnpm-install-safe.sh", "install"], {
        env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" },
      });
      run("pnpm", ["run", "build:ordered"]);
    } else if (hasCommand("pnpm")) {
      run("pnpm", ["install"], { env: { ALLOW_SUBREPO_PNPM_INSTALL: "1" } });
      run("pnpm", ["run", "build:ordered"]);
    } else {
      console.warn("pnpm not available; skipping build phase.");
    }
  } else {
    log("Phase 4: Skipping build phase (--skip-build)");
  }

  // 5. Final Health Check
  if (!flags.skipHealth) {
    log("Phase 5: Final Health Check...");

    // 5a. Skeleton Validation
    const skeletonScript = join(
      ROOT,
      ".dev/automation/scripts/check-workspace-skeleton.py",
    );
    if (existsSync(skeletonScript)) {
      log("Validating workspace skeleton...");
      // Run without --apply to just check
      const res = spawnSync("python3", [skeletonScript], {
        encoding: "utf-8",
        cwd: ROOT,
      });
      if (res.status !== 0) {
        console.warn(
          "\x1b[33m[WARN] Workspace skeleton issues detected (run check-workspace-skeleton.py for details).\x1b[0m",
        );
      } else {
        log("✔ Workspace skeleton compliant.");
      }
    }

    // 5b. General Health
    if (existsSync(join(ROOT, "scripts/health-check.mjs"))) {
      run("node", ["scripts/health-check.mjs"]);
    }
  } else {
    log("Phase 5: Skipping health checks (--skip-health)");
  }

  log("✅ Workspace upgrade complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
