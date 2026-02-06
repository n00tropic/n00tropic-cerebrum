import json
from pathlib import Path
from mcp.capabilities_manifest import CapabilityManifest
from mcp.federation_manifest import FederationManifest


def dump_schema(model, filename):
    schema = model.model_json_schema()
    path = Path("mcp/schemas") / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {path}")


def main():
    dump_schema(CapabilityManifest, "capabilities.schema.json")
    dump_schema(FederationManifest, "federation.schema.json")


if __name__ == "__main__":
    main()
