#!/usr/bin/env python3
"""Generate directory trees from template specs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml  # optional
except ImportError:
    yaml = None


def _emit(message: str) -> None:
    """Provide CLI feedback without relying on print()."""
    sys.stdout.write(f"{message}\n")


def load_spec(path: Path) -> dict[str, Any]:
    """Load a JSON or YAML template specification into memory."""
    text = path.read_text(encoding="utf-8")
    if path.suffix in {".yaml", ".yml"}:
        if not yaml:
            message = "PyYAML not installed"
            raise SystemExit(message)
        return yaml.safe_load(text)
    return json.loads(text)


def main() -> None:
    """Render the requested template structure onto disk."""
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="templates/template.json")
    ap.add_argument("--dest", required=True)
    args = ap.parse_args()
    spec = load_spec(Path(args.source))
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
