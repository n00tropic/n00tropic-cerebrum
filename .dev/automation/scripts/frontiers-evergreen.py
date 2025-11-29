#!/usr/bin/env python3
"""Frontiers evergreen validation orchestrator.

Runs n00-frontiers template validation whenever canonical inputs (toolchain
manifest, catalog) change and records telemetry artifacts for lifecycle radar
and control panel consumers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[3]
FRONTIERS_ROOT = ROOT / "n00-frontiers"
TOOLCHAIN_MANIFEST = ROOT / "n00-cortex" / "data" / "toolchain-manifest.json"
CATALOG_JSON = FRONTIERS_ROOT / "catalog.json"
ARTIFACT_DIR = ROOT / ".dev" / "automation" / "artifacts" / "automation"
STATE_PATH = ARTIFACT_DIR / "frontiers-evergreen-state.json"
DEFAULT_RUN_ID = "frontiers-evergreen"

WATCH_TARGETS = {
    "toolchainManifest": TOOLCHAIN_MANIFEST,
    "frontiersCatalog": CATALOG_JSON,
}


def sha256(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_state() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_state(payload: Dict[str, object]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def determine_hashes() -> Dict[str, Optional[str]]:
    hashes: Dict[str, Optional[str]] = {}
    for key, target in WATCH_TARGETS.items():
        hashes[key] = sha256(target)
    return hashes


def changed_targets(hashes: Dict[str, Optional[str]], state: Dict[str, Any]) -> List[str]:
    previous = state.get("hashes") or {}
    changed: List[str] = []
    for key, digest in hashes.items():
        if digest != previous.get(key):
            changed.append(key)
    return changed


def format_command(args: argparse.Namespace) -> List[str]:
    cmd = [".dev/validate-templates.sh", "--all"]
    for tmpl in args.templates:
        cmd.extend(["--template", tmpl])
    if args.force_rebuild:
        cmd.append("--force-rebuild")
    return cmd


def write_log(log_path: Path, stdout: str, stderr: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(stdout + "\n--- stderr ---\n" + stderr, encoding="utf-8")


def run_validation(args: argparse.Namespace, hashes: Dict[str, Optional[str]], state: Dict[str, Any]) -> int:
    cmd = format_command(args)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_id = f"{DEFAULT_RUN_ID}-{timestamp}"
    log_path = ARTIFACT_DIR / f"{run_id}.log"
    json_path = ARTIFACT_DIR / f"{run_id}.json"

    start = time.monotonic()
    result = subprocess.run(
        cmd,
        cwd=FRONTIERS_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    duration = time.monotonic() - start
    write_log(log_path, result.stdout, result.stderr)

    summary = {
        "runId": run_id,
        "timestamp": timestamp,
        "command": " ".join(cmd),
        "templates": args.templates or ["*"],
        "forceRebuild": args.force_rebuild,
        "durationSeconds": round(duration, 2),
        "exitCode": result.returncode,
        "hashes": hashes,
        "changedTargets": changed_targets(hashes, state),
        "logPath": str(log_path.relative_to(ROOT)),
        "artifactPath": str(json_path.relative_to(ROOT)),
    }
    summary["status"] = "success" if result.returncode == 0 else "failed"

    json_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    next_state = dict(state)
    next_state["lastRun"] = summary
    if result.returncode == 0:
        next_state["hashes"] = hashes
    save_state(next_state)

    print(json.dumps(summary, indent=2))
    return result.returncode


def ensure_prereqs() -> None:
    if not FRONTIERS_ROOT.exists():
        raise SystemExit(f"n00-frontiers repo not found at {FRONTIERS_ROOT}")
    for key, target in WATCH_TARGETS.items():
        if not target.exists():
            raise SystemExit(f"Required file for {key} not found: {target}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Frontiers evergreen validator")
    parser.add_argument(
        "--templates",
        action="append",
        default=[],
        help="Limit validation to specific templates (repeatable)",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Force rebuild of template render caches",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force validation even when no watched files changed",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only report whether validation is required",
    )
    return parser.parse_args()


def main() -> int:
    ensure_prereqs()
    args = parse_args()
    state = load_state()
    hashes = determine_hashes()
    changed = changed_targets(hashes, state)
    needs_run = bool(changed) or args.force or not state.get("lastRun")

    payload = {
        "needsRun": needs_run,
        "changedTargets": changed,
        "hashes": hashes,
        "statePath": str(STATE_PATH.relative_to(ROOT)) if STATE_PATH.exists() else None,
    }
    payload["status"] = "needs-run" if needs_run else "clean"

    if args.check_only:
        print(json.dumps(payload, indent=2))
        return 0

    if not needs_run and not args.force:
        payload["status"] = "skipped"
        payload["message"] = "No watched changes detected; use --force to run anyway."
        print(json.dumps(payload, indent=2))
        return 0

    return run_validation(args, hashes, state)


if __name__ == "__main__":
    sys.exit(main())
