from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("")
async def list_sessions() -> Any:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.kagent_controller_url}/api/sessions"
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Controller error: {e}")
