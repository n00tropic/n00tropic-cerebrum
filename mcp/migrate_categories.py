import json
from pathlib import Path

# Mapping of keywords/patterns to categories
CATEGORY_MAP = {
    "orchestrate": "generation",
    "generate": "generation",
    "ingest": "generation",
    "validate": "analysis",
    "check": "analysis",
    "lint": "analysis",
    "test": "analysis",
    "audit": "analysis",
    "verify": "analysis",
    "scorecard": "observability",
    "health": "observability",
    "telemetry": "observability",
    "deploy": "deployment",
    "release": "deployment",
    "publish": "deployment",
    "run": "automation",
    "exec": "automation",
    "training": "automation",
    "build": "automation",
    "sync": "maintenance",
    "clean": "maintenance",
    "fix": "maintenance",
    "prune": "maintenance",
    "scaffold": "generation",
    "plan": "core",
}

DEFAULT_CATEGORY = "automation"


def determine_category(cap_id: str, tags: list[str]) -> str:
    # Check ID parts
    parts = cap_id.lower().split(".")
    for part in parts:
        for key, cat in CATEGORY_MAP.items():
            if key in part:
                return cat

    # Check tags
    for tag in tags:
        for key, cat in CATEGORY_MAP.items():
            if key in tag.lower():
                return cat

    return DEFAULT_CATEGORY


def migrate_manifest(path: Path):
    print(f"Migrating {path}...")
    try:
        data = json.loads(path.read_text())
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return

    changed = False
    for cap in data.get("capabilities", []):
        meta = cap.get("metadata", {})
        if "category" not in meta:
            cat = determine_category(cap.get("id", ""), meta.get("tags", []))
            meta["category"] = cat
            # Ensure owner is set if missing (required for MCP enabled)
            if (
                cap.get("agent", {}).get("mcp", {}).get("enabled", False)
                and "owner" not in meta
            ):
                meta["owner"] = "platform-ops"  # Default fallback

            cap["metadata"] = meta
            changed = True
            print(f"  - {cap['id']} -> {cat}")

    if changed:
        path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"Saved {path}")


def main():
    root = Path(".")
    manifests = list(root.glob("platform/*/mcp/capabilities_manifest.json"))
    # Also include the core n00t manifest if it lives elsewhere
    if (root / "platform/n00t/capabilities/manifest.json").exists():
        manifests.append(root / "platform/n00t/capabilities/manifest.json")

    for m in manifests:
        migrate_manifest(m)


if __name__ == "__main__":
    main()
