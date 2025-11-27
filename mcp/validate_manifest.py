#!/usr/bin/env python3
"""Validate the MCP capability manifest and print a hardened summary."""

from __future__ import annotations

from mcp.capabilities_manifest import CapabilityManifest
from pathlib import Path

import argparse
import json

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "n00t" / "capabilities" / "manifest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help="Path to the capability manifest (defaults to repository manifest)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the validated capability index as JSON",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = CapabilityManifest.load(args.manifest, REPO_ROOT)
    enabled = [cap.id for cap in manifest.enabled_capabilities()]
    summary = {
        "manifest": str(args.manifest),
        "version": manifest.version,
        "enabled": enabled,
        "count": len(enabled),
    }
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"Manifest: {summary['manifest']}")
        print(f"Version : {summary['version']}")
        print(f"Enabled : {summary['count']} -> {', '.join(enabled)}")


if __name__ == "__main__":
    main()
