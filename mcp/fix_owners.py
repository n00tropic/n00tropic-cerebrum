import json
from pathlib import Path

# Ownership mapping based on namespace
OWNER_MAP = {
    "horizons": "governance-ops",
    "fusion": "content-ops",
    "workspace": "platform-ops",
    "dependencies": "platform-ops",
    "cortex": "data-ops",
    "school": "education-ops",
    "ai.workflow": "ai-ops",
    "erpnext": "business-ops",
    "project": "project-ops",
    "telemetry": "platform-ops",
    "trunk": "platform-ops",
    "merge": "platform-ops",
    "branches": "platform-ops",
    "checks": "platform-ops",
    "metadata": "platform-ops",
    "plan": "platform-ops",
    "report": "platform-ops",
    "github": "platform-ops",
    "runner": "platform-ops",
    "foundry": "platform-ops",
    "deps": "platform-ops",
    "docs": "platform-ops",
    "frontiers": "platform-ops",  # Defaulting frontiers to platform-ops unless specific
    "search": "platform-ops",
    "n00menon": "platform-ops",  # n00menon specific caps in n00t manifest
    "n00man": "platform-ops",
}

DEFAULT_OWNER = "platform-ops"


def determine_owner(cap_id: str) -> str:
    for prefix, owner in OWNER_MAP.items():
        if cap_id.startswith(prefix):
            return owner
    return DEFAULT_OWNER


def fix_manifest(path: Path):
    print(f"Fixing {path}...")
    try:
        data = json.loads(path.read_text())
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return

    changed = False
    for cap in data.get("capabilities", []):
        meta = cap.get("metadata", {})
        if not meta.get("owner"):
            owner = determine_owner(cap.get("id", ""))
            meta["owner"] = owner
            cap["metadata"] = meta
            changed = True
            print(f"  - Assigned {owner} to {cap['id']}")

    if changed:
        path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"Saved {path}")


def main():
    # Target the n00t manifest specifically as it had the issues
    target = Path("platform/n00t/capabilities/manifest.json")
    if target.exists():
        fix_manifest(target)
    else:
        print(f"Target manifest not found: {target}")


if __name__ == "__main__":
    main()
