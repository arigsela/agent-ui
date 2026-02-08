from __future__ import annotations

import asyncio
import logging

import httpx

from app.config import settings
from app.models import AgentCard, AgentCapabilities, AgentInfo, AgentSkill

logger = logging.getLogger(__name__)


class AgentCache:
    def __init__(self) -> None:
        self._agents: list[AgentInfo] = []
        self._cards: dict[str, AgentCard] = {}
        self._task: asyncio.Task[None] | None = None

    @property
    def agents(self) -> list[AgentInfo]:
        return list(self._agents)

    def get_card(self, name: str) -> AgentCard | None:
        return self._cards.get(name)

    async def start(self) -> None:
        await self._refresh()
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while True:
            await asyncio.sleep(settings.agent_cache_ttl_seconds)
            await self._refresh()

    async def _refresh(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{settings.kagent_controller_url}/api/agents"
                )
                resp.raise_for_status()
                data = resp.json()

            agents: list[AgentInfo] = []
            for item in data.get("data", []):
                agent_obj = item.get("agent", {})
                meta = agent_obj.get("metadata", {})
                spec = agent_obj.get("spec", {})
                status = agent_obj.get("status", {})
                name = meta.get("name", "")
                description = spec.get("description", "")
                conditions = status.get("conditions", [])
                ready = any(
                    c.get("type") == "Ready" and c.get("status") == "True"
                    for c in conditions
                )
                agents.append(AgentInfo(name=name, description=description, ready=ready))

            self._agents = agents
            logger.info("Refreshed agent list: %d agents", len(agents))

            # Fetch cards for each agent
            await self._refresh_cards(agents)

        except Exception:
            logger.exception("Failed to refresh agent cache")

    async def _refresh_cards(self, agents: list[AgentInfo]) -> None:
        fetched: dict[str, AgentCard] = {}
        async with httpx.AsyncClient(timeout=10) as client:
            for agent in agents:
                base = settings.kagent_agent_url_template.format(name=agent.name)
                url = f"{base}/.well-known/agent-card.json"
                # Deduplicate: if same URL already fetched, reuse the card
                if url in fetched:
                    self._cards[agent.name] = fetched[url]
                    continue
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    card_data = resp.json()
                    skills = [
                        AgentSkill(**s) for s in card_data.get("skills", [])
                    ]
                    caps = AgentCapabilities(**card_data.get("capabilities", {}))
                    card = AgentCard(
                        name=card_data.get("name", agent.name),
                        description=card_data.get("description", ""),
                        url=card_data.get("url", ""),
                        skills=skills,
                        capabilities=caps,
                    )
                    fetched[url] = card
                    self._cards[agent.name] = card
                except Exception:
                    logger.warning("Failed to fetch card for %s", agent.name)


    async def force_refresh(self) -> None:
        await self._refresh()


agent_cache = AgentCache()
