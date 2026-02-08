from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent_cache import agent_cache
from app.config import settings
from app.routers import agents, chat, sessions


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await agent_cache.start()
    yield
    await agent_cache.stop()


app = FastAPI(title="kagent Agent UI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(chat.router)
app.include_router(sessions.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
