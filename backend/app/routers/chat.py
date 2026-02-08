from __future__ import annotations

import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.a2a_client import send_message, stream_message
from app.models import ChatResponse, SendRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/send", response_model=ChatResponse)
async def chat_send(req: SendRequest) -> ChatResponse:
    return await send_message(req.agent_name, req.text, req.context_id)


@router.post("/stream")
async def chat_stream(req: SendRequest) -> EventSourceResponse:
    async def event_generator():
        async for event in stream_message(req.agent_name, req.text, req.context_id):
            yield {"data": json.dumps(event)}

    return EventSourceResponse(event_generator())
