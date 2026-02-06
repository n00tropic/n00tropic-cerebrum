#!/usr/bin/env python3
"""Project management CLI: list, status, audit, and touched files analysis."""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Path constants
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
PLATFORM_DIR = REPO_ROOT / "platform"
CATALOG_PATH = PLATFORM_DIR / "n00-cortex" / "data" / "catalog" / "projects.json"
SCHEMA_PATH = PLATFORM_DIR / "n00-cortex" / "schemas" / "project-metadata.schema.json"


def load_catalog() -> Dict:
    if not CATALOG_PATH.exists():
        print(f"Error: Catalog not found at {CATALOG_PATH}", file=sys.stderr)
        sys.exit(1)
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def cmd_list(args):
    data = load_catalog()
    projects = data.get("projects", [])

    if args.filter_stage:
        projects = [
            p for p in projects if p.get("lifecycle_stage") == args.filter_stage
        ]

    print(f"{'ID':<35} {'STAGE':<12} {'Owner':<15} {'TITLE'}")
    print("-" * 100)
    for p in projects:
        pid = p.get("id", "N/A")
        stage = p.get("lifecycle_stage", "N/A")
        owner = p.get("owner", "N/A")
        title = p.get("title", "N/A")
        print(f"{pid:<35} {stage:<12} {owner:<15} {title}")


def cmd_status(args):
    data = load_catalog()
    projects = data.get("projects", [])

    # Group by stage
    stages = {"discover": [], "shape": [], "deliver": [], "archive": []}
    for p in projects:
        stage = p.get("lifecycle_stage", "unknown")
        if stage in stages:
            stages[stage].append(p)
        else:
            stages.setdefault("other", []).append(p)

    # Generate Markdown
    lines = [
        "# Project Status Dashboard",
        "",
        f"Generated on {datetime.now().strftime('%Y-%m-%d')}",
        "",
    ]

    for stage_name, items in stages.items():
        if not items:
            continue
        lines.append(f"## {stage_name.title()}")
        for p in items:
            lines.append(f"### {p.get('title')} (`{p.get('id')}`)")
            lines.append(f"- **Status**: {p.get('status', 'Unknown')}")
            lines.append(f"- **Owner**: {p.get('owner')}")
            if p.get("erpnext_project"):
                lines.append(f"- **ERPNext**: {p.get('erpnext_project')}")
            if p.get("links"):
                lines.append("- **Links**:")
                for link in p.get("links"):
                    path = link.get("path")
                    ltype = link.get("type")
                    lines.append(f"  - [{ltype}]({path})")
            lines.append("")

    content = "\n".join(lines)

    if args.write:
        dest = REPO_ROOT / "PROJECT_STATUS.md"
        dest.write_text(content, encoding="utf-8")
        print(f"Updated {dest}")
    else:
        print(content)


def get_git_touched_files(project_id: str) -> List[str]:
    """Scan git log for commits containing project_id and return changed files."""
    # Grep in log for the project ID
    # This is a simple heuristic: looks for [id] or id in commit msg
    # Use -i for case insensitivity if needed, but IDs should be standard.
    # We use --grep to filter commits, then --name-only to get files.

    # Heuristics: "id", "[id]", "id:"
    # We'll search for the ID string.
    try:
        cmd = ["git", "log", "--name-only", "--pretty=format:", f"--grep={project_id}"]
        result = subprocess.run(
            cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=False
        )
        if result.returncode != 0:
            print(f"Git error: {result.stderr}", file=sys.stderr)
            return []

        files = set()
        for line in result.stdout.splitlines():
            if line.strip():
                files.add(line.strip())
        return sorted(list(files))
    except Exception as e:
        print(f"Error running git: {e}", file=sys.stderr)
        return []


def cmd_files(args):
    pid = args.id
    print(f"Analyzing touched files for project '{pid}'...")
    files = get_git_touched_files(pid)

    if not files:
        print("No touched files found in git history with this project ID.")
        return

    print(f"Found {len(files)} files:")
    for f in files:
        print(f"- {f}")


def cmd_audit(args):
    # Delegate to the existing validation script
    script = SCRIPT_DIR / "validate-project-metadata.py"
    print("Running metadata validation...")
    subprocess.run([sys.executable, str(script)], cwd=REPO_ROOT)


def main():
    parser = argparse.ArgumentParser(description="Project Management CLI")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # List
    list_parser = subparsers.add_parser("list", help="List projects")
    list_parser.add_argument("--filter-stage", help="Filter by lifecycle stage")
    list_parser.set_defaults(func=cmd_list)

    # Status
    status_parser = subparsers.add_parser("status", help="Generate status report")
    status_parser.add_argument(
        "--write", action="store_true", help="Update PROJECT_STATUS.md in root"
    )
    status_parser.set_defaults(func=cmd_status)

    # Files
    files_parser = subparsers.add_parser(
        "files", help="Show files touched by this project"
    )
    files_parser.add_argument("id", help="Project ID")
    files_parser.set_defaults(func=cmd_files)

    # Audit
    audit_parser = subparsers.add_parser("audit", help="Audit project metadata")
    audit_parser.set_defaults(func=cmd_audit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
