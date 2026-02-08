import logging

import httpx
from fastapi import APIRouter, HTTPException

from app.agent_cache import agent_cache
from app.config import settings
from app.models import AgentCard, AgentInfo, CreateAgentRequest, CreateAgentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=list[AgentInfo])
async def list_agents() -> list[AgentInfo]:
    return agent_cache.agents


@router.get("/{name}/card", response_model=AgentCard)
async def get_agent_card(name: str) -> AgentCard:
    card = agent_cache.get_card(name)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Agent card not found: {name}")
    return card


@router.post("/create", response_model=CreateAgentResponse)
async def create_agent(req: CreateAgentRequest) -> CreateAgentResponse:
    crd = {
        "apiVersion": "kagent.dev/v1alpha2",
        "kind": "Agent",
        "metadata": {
            "name": req.name,
            "namespace": req.namespace,
        },
        "spec": {
            "description": req.description,
            "type": "Declarative",
            "declarative": {
                "systemMessage": req.systemMessage,
                "modelConfig": req.modelConfig,
                "stream": req.stream,
            },
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.kagent_controller_url}/api/agents",
                json=crd,
            )
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        logger.error("Controller rejected agent creation: %s", detail)
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except Exception as exc:
        logger.exception("Failed to create agent")
        raise HTTPException(status_code=502, detail=str(exc))

    # Refresh cache so the new agent shows up immediately
    await agent_cache.force_refresh()

    return CreateAgentResponse(name=req.name, namespace=req.namespace)
