#!/usr/bin/env python3
"""Ensure all renovate.json files extend the centralized Renovate preset.

Defaults to a read-only check. Pass `--apply` to write fixes or `--check` to
fail CI/hooks when drift is detected.
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Iterable, List

ROOT = Path(__file__).resolve().parents[3]
CENTRAL_EXTEND = "github>n00tropic/n00tropic-cerebrum//renovate-presets/workspace.json"
CENTRAL_EXTEND_LOCAL = "local>renovate-presets/workspace.json"
LEGACY_EXTENDS = [
    "github>n00tropic/n00-cortex//renovate-presets/workspace.json",
]
SKIP_SUBSTRINGS = [
    "n00-frontiers/applications/scaffolder/",  # generated templates
    "artifacts/tmp/super-linter/",  # test fixtures
]


def find_renovate_files(pattern: str) -> Iterable[Path]:
    # rglob so nested subrepos (and future additions) are covered
    for path in ROOT.rglob(pattern):
        # Skip generated or fixture locations
        if any(part in str(path) for part in SKIP_SUBSTRINGS):
            continue
        yield path


def ensure_extend(path: Path, required_extend: str, apply: bool = False) -> bool:
    logging.debug(f"Reading renovate file: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    extends: List[str] = payload.get("extends") or []
    if isinstance(extends, str):
        extends = [extends]
    # Accept local or central or legacy extends as valid
    if (
        required_extend in extends
        or CENTRAL_EXTEND_LOCAL in extends
        or any(v in extends for v in LEGACY_EXTENDS)
    ):
        return False

    extends = [required_extend] + [e for e in extends if e != required_extend]
    payload["extends"] = extends
    if apply:
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write the changes")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if changes would be made",
    )
    parser.add_argument(
        "--pattern",
        default="**/renovate.json",
        help="Glob pattern to find renovate.json files to update",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if "VERBOSE" in logging.root.manager.loggerDict:
        logging.getLogger().setLevel(logging.DEBUG)

    changed = []
    for path in find_renovate_files(args.pattern):
        try:
            if ensure_extend(path, CENTRAL_EXTEND, apply=args.apply):
                print(f"Will add extend to {path}")
                changed.append(path)
            else:
                print(f"Already extends central preset: {path}")
        except Exception as e:
            logging.exception(f"Failed to process {path}: {e}")

    if args.apply and changed:
        print("Updated:")
        for p in changed:
            print(f" - {p}")
    elif not changed:
        print("No changes needed.")

    if args.check and changed:
        print("Missing centralized extends detected.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
