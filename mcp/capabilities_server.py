#!/usr/bin/env python3
"""
MCP server exposing n00t capability manifest as tools.

Each capability with `agent.mcp.enabled: true` in `n00t/capabilities/manifest.json`
is exposed as an MCP tool. Calls invoke the capability entrypoint as a subprocess.
Inputs are passed via:
  - JSON payload in env `CAPABILITY_INPUTS`
  - Per-key env vars: `INPUT_<KEY>` (upper snake)
Stdout/stderr/exit code are returned to the caller.
"""

from __future__ import annotations

from mcp.server.fastmcp.utilities.func_metadata import ArgModelBase, FuncMetadata
from pathlib import Path
from pydantic import ConfigDict, create_model
from typing import Any, Dict, Type

import asyncio
import json
import os
import re
import shlex
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "n00t" / "capabilities" / "manifest.json"
mcp = None  # FastMCP will be loaded lazily


class _CapabilityArgBase(ArgModelBase):
    """Base arg model that preserves optional inputs and extras."""

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="allow")

    def model_dump_one_level(self) -> dict[str, Any]:
        data: dict[str, Any] = {}
        for field_name, field_info in self.__class__.model_fields.items():
            if (
                field_name not in self.model_fields_set
                and field_info.default is not Ellipsis
            ):
                continue
            value = getattr(self, field_name)
            output_name = field_info.alias or field_name
            data[output_name] = value
        extra = getattr(self, "model_extra", None)
        if isinstance(extra, dict):
            data.update(extra)
        return data


def _sanitize_model_name(cap_id: str) -> str:
    sanitized = re.sub(r"[^0-9a-zA-Z]+", "_", cap_id).strip("_")
    return sanitized or "capability"


def _normalize_schema(schema: Dict[str, Any] | None) -> Dict[str, Any]:
    if not isinstance(schema, dict):
        return {"type": "object"}
    normalized = dict(schema)
    normalized.setdefault("type", "object")
    return normalized


def _arg_model_for_capability(
    cap_id: str, schema: Dict[str, Any]
) -> Type[ArgModelBase]:
    properties = schema.get("properties") if isinstance(schema, dict) else None
    required = set(schema.get("required", []) if isinstance(schema, dict) else [])
    field_defs: dict[str, tuple[type[Any], Any]] = {}
    if isinstance(properties, dict):
        for prop_name in properties.keys():
            default = ... if prop_name in required else None
            field_defs[prop_name] = (Any, default)
    extra_behavior = "allow"
    additional = (
        schema.get("additionalProperties") if isinstance(schema, dict) else None
    )
    if isinstance(additional, bool) and additional is False:
        extra_behavior = "forbid"
    config = ConfigDict(arbitrary_types_allowed=True, extra=extra_behavior)
    model_name = f"{_sanitize_model_name(cap_id)}Inputs"
    return create_model(
        model_name,
        __base__=_CapabilityArgBase,
        __config__=config,
        **field_defs,
    )


def _func_metadata_for_capability(cap_id: str, schema: Dict[str, Any]) -> FuncMetadata:
    arg_model = _arg_model_for_capability(cap_id, schema)
    return FuncMetadata(arg_model=arg_model)


def _load_manifest() -> Dict[str, Any]:
    text = MANIFEST_PATH.read_text(encoding="utf-8")
    return json.loads(text)


def _enabled_caps(manifest: Dict[str, Any]) -> list[Dict[str, Any]]:
    caps = []
    for cap in manifest.get("capabilities", []):
        agent_cfg = cap.get("agent", {})
        mcp_cfg = agent_cfg.get("mcp", {}) if isinstance(agent_cfg, dict) else {}
        if mcp_cfg.get("enabled", False):
            caps.append(cap)
    return caps


def _to_upper_snake(name: str) -> str:
    s = re.sub(r"[^0-9a-zA-Z]+", "_", name)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    return s.upper().strip("_")


def _build_command(entrypoint: str) -> list[str]:
    ep_path = (REPO_ROOT / entrypoint).resolve()
    if ep_path.suffix == ".py":
        return ["python", str(ep_path)]
    if ep_path.suffix == ".sh":
        return ["bash", str(ep_path)]
    # If executable, run directly; otherwise default to bash
    if os.access(ep_path, os.X_OK):
        return [str(ep_path)]
    return ["bash", str(ep_path)]


def _register_capability(cap: Dict[str, Any]) -> None:
    cap_id = cap["id"]
    inputs_schema = _normalize_schema(cap.get("inputs"))
    entrypoint = cap["entrypoint"]
    summary = cap.get("summary", cap_id)

    async def _run(**kwargs: Any) -> Dict[str, Any]:
        cmd = _build_command(entrypoint)
        env = os.environ.copy()
        env["WORKSPACE_ROOT"] = str(REPO_ROOT)
        env["CAPABILITY_ID"] = cap_id
        env["CAPABILITY_INPUTS"] = json.dumps(kwargs)
        for key, value in kwargs.items():
            env[f"INPUT_{_to_upper_snake(key)}"] = str(value)

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(REPO_ROOT),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out_b, err_b = await proc.communicate()
        out = out_b.decode(errors="replace")
        err = err_b.decode(errors="replace")
        status = "ok" if proc.returncode == 0 else "error"
        return {
            "status": status,
            "exitCode": proc.returncode,
            "stdout": out[-4000:],  # tail to avoid overload
            "stderr": err[-4000:],
            "command": " ".join(shlex.quote(p) for p in cmd),
        }

    tool_name = cap_id.replace(".", "_")
    assert mcp is not None
    mcp.add_tool(_run, name=tool_name, description=summary)
    registered_tool = mcp._tool_manager.get_tool(
        tool_name
    )  # noqa: SLF001 - FastMCP lacks a public accessor
    if registered_tool is None:
        raise RuntimeError(f"Failed to register capability '{cap_id}' as MCP tool")
    registered_tool.parameters = inputs_schema
    registered_tool.fn_metadata = _func_metadata_for_capability(cap_id, inputs_schema)


def _discover_and_register() -> None:
    global mcp
    if mcp is None:
        try:
            from mcp.server.fastmcp import FastMCP  # type: ignore
        except ImportError:
            print("fastmcp not installed. pip install mcp", file=sys.stderr)
            raise
        mcp = FastMCP("n00t-capabilities")

    manifest = _load_manifest()
    for cap in _enabled_caps(manifest):
        _register_capability(cap)


def list_capabilities() -> list[str]:
    manifest = _load_manifest()
    return [cap["id"] for cap in _enabled_caps(manifest)]


def list_capability_meta() -> list[Dict[str, Any]]:
    manifest = _load_manifest()
    result: list[Dict[str, Any]] = []
    for cap in _enabled_caps(manifest):
        entry = {
            "id": cap.get("id"),
            "summary": cap.get("summary"),
            "entrypoint": cap.get("entrypoint"),
            "tags": (
                cap.get("metadata", {}).get("tags")
                if isinstance(cap.get("metadata"), dict)
                else None
            ),
            "inputs": cap.get("inputs"),
            "outputs": cap.get("outputs"),
        }
        result.append(entry)
    return result


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] in {"--list", "-l"}:
        for name in list_capabilities():
            print(name)
        return
    _discover_and_register()
    assert mcp is not None

    # Index/meta tools
    @mcp.tool(
        name="n00t_capabilities_index",
        description="List MCP-enabled n00t capabilities with metadata",
    )
    def _index() -> dict[str, Any]:
        return {"capabilities": list_capability_meta()}

    @mcp.tool(
        name="n00t_capability_help", description="Describe a specific n00t capability"
    )
    def _help(capability_id: str) -> dict[str, Any]:
        for cap in list_capability_meta():
            if cap["id"] == capability_id:
                return cap
        return {"error": f"Capability '{capability_id}' not found"}

    mcp.run()


if __name__ == "__main__":
    main()
