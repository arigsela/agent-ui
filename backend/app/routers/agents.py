from fastapi import APIRouter, HTTPException

from app.agent_cache import agent_cache
from app.models import AgentCard, AgentInfo

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
