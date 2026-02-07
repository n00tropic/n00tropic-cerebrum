#!/usr/bin/env python3
"""Generate a directory skeleton for the frontier webapp template."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def _emit(message: str) -> None:
    """Provide CLI feedback without relying on print()."""
    sys.stdout.write(f"{message}\n")


def _load_spec(path: Path) -> dict[str, Any]:
    """Load the JSON skeleton specification."""
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    """Render directories and files described in the JSON spec."""
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="templates/template.json")
    ap.add_argument("--dest", required=True)
    args = ap.parse_args()
    spec = _load_spec(Path(args.source))
    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    for item in spec["structure"]:
        path = dest / item["path"]
        if item["type"] == "dir":
            path.mkdir(parents=True, exist_ok=True)
        elif item["type"] == "file":
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                path.write_text("", encoding="utf-8")
    _emit(f"Generated skeleton at {dest}")


if __name__ == "__main__":
    main()
