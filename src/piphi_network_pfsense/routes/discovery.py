from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from piphi_runtime_kit_python import (
    IntegrationDiscoveryRequest,
    build_discovery_response,
    normalize_discovery_inputs,
)

from ..contract import CONFIG_SCHEMA

router = APIRouter(tags=["discovery"])


@router.post("/discover")
async def discover(payload: IntegrationDiscoveryRequest | None = None) -> Any:
    inputs = normalize_discovery_inputs(payload.inputs if payload else None)
    return build_discovery_response(
        [
            {
                "id": str(inputs.get("host") or "pfsense-firewall"),
                "device_id": str(inputs.get("host") or "pfsense-firewall"),
                "host": inputs.get("host", "pfsense.local"),
                "alias": "pfSense Firewall",
                "discovery_method": "user_supplied_host",
            }
        ]
    )


@router.get("/ui-config")
async def ui_config() -> dict[str, Any]:
    return CONFIG_SCHEMA
