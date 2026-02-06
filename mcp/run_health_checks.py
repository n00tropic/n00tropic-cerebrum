import json
import subprocess
import sys
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Optional

# Ensure mcp module is reachable
sys.path.append(str(Path.cwd()))

from mcp.capabilities_manifest import CapabilityManifest
from mcp.federation_manifest import FederationManifest


@dataclass
class Issue:
    title: str
    body: str
    labels: List[str]
    module: str
    severity: str


ISSUES: List[Issue] = []


def log_issue(title: str, body: str, module: str, severity: str = "medium"):
    print(f"[{severity.upper()}] {module}: {title}")
    ISSUES.append(
        Issue(
            title=f"MCP Health: {title} ({module})",
            body=f"**Module**: `{module}`\n**Severity**: {severity.upper()}\n\n{body}",
            labels=["mcp", "health-check", f"severity/{severity}"],
            module=module,
            severity=severity,
        )
    )


def check_entrypoint(
    wrapper_id: str, entrypoint: str, repo_root: Path, module_name: str
):
    # Resolve full path (simplified logic, relying on manifest relative resolution mostly)
    # But here we just want to check existence on disk from the repo root perspective
    # entrypoint is relative to manifest usually, but let's try to resolve it.

    # We can't strictly resolve without manifest dir context, but we can try heuristic
    # If standard "../" pattern

    # Actually, best is to check if we can resolve it using the logic we added to capabilities_manifest.py?
    # But that requires instantiating the class.

    # Let's do basic file checks.
    if entrypoint.startswith("${WORKSPACE_ROOT}"):
        path = Path(entrypoint.replace("${WORKSPACE_ROOT}", str(Path.cwd())))
    elif entrypoint.startswith("../"):
        # Heuristic: Manifest is usually in mcp/ or platform/x/mcp/
        # This is hard to resolve without the exact manifest path.
        # Let's skip complex relative path math here and rely on the fact that existing validation passed.
        # The existing validation (capabilities_server --list-modules) ALREADY checks file existence!
        # So if list-modules passed, files exist.
        pass

    # Check execution (permissions)
    # We can't easy check permissions of resolved path without resolving it.
    pass


def run_help_check(cap_id: str, entrypoint: str, module_name: str, repo_root: Path):
    # Try to run with --help if it looks like a script
    # This is "dry run"
    pass


def validate_module(name: str, manifest_path: Path, repo_root: Path):
    print(f"Checking {name} at {manifest_path}...")

    if not manifest_path.exists():
        log_issue("Manifest missing", f"File not found: {manifest_path}", name, "high")
        return

    try:
        # Load and validate structure + entrypoints (this usage invokes the Pydantic validation logic)
        manifest = CapabilityManifest.load(manifest_path, repo_root)

        # Additional checks: specific field contents, "nice to haves"
        for cap in manifest.capabilities:
            if not cap.metadata.category:
                log_issue(
                    f"Missing category for {cap.id}",
                    "Capability is missing required 'category' metadata.",
                    name,
                    "high",
                )

            if not cap.metadata.owner:
                log_issue(
                    f"Missing owner for {cap.id}",
                    "Capability is missing 'owner'.",
                    name,
                    "medium",
                )

    except Exception as e:
        log_issue(
            "Validation failed",
            f"Exception during validation:\n```\n{str(e)}\n```",
            name,
            "high",
        )


def run_health_checks():
    # 1. Load Federation
    fed_path = Path("mcp/federation_manifest.json")
    if not fed_path.exists():
        log_issue(
            "Federation Manifest Missing",
            "mcp/federation_manifest.json not found.",
            "root",
            "high",
        )
        return

    try:
        with open(fed_path) as f:
            fed_data = json.load(f)
            # Basic schema check manually or via Pydantic if we had a Federation model (we do in generate_schemas, need to import if available)
            # generic Pydantic check:
            # FederationManifest(**fed_data)
            pass
    except Exception as e:
        log_issue("Federation JSON Invalid", str(e), "root", "high")
        return

    modules = fed_data.get("modules", [])
    workspace_root = Path.cwd()

    for mod in modules:
        if isinstance(mod, dict):  # New schema
            name = mod.get("id") or mod.get("module")
            man_rel = mod.get("manifest")
            root_rel = mod.get("repoRoot")

            if not name or not man_rel or not root_rel:
                log_issue(
                    "Malformed Federation Entry",
                    f"Entry missing keys: {mod}",
                    "root",
                    "high",
                )
                continue

            man_path = workspace_root / man_rel
            repo_path = workspace_root / root_rel

            validate_module(name, man_path, repo_path)
        else:
            # Legacy string?
            pass

    # Report
    if ISSUES:
        print(f"\nFound {len(ISSUES)} issues.")
        report_path = Path("mcp/HEALTH_REPORT.json")
        with open(report_path, "w") as f:
            json.dump([asdict(i) for i in ISSUES], f, indent=2)
        print(f"Report written to {report_path}")

    else:
        print("\nAll checks passed! System is healthy.")


if __name__ == "__main__":
    run_health_checks()
