from __future__ import annotations

import uuid
from typing import Any, AsyncIterator

import httpx

from app.config import settings
from app.models import (
    Artifact,
    ChatResponse,
    HistoryMessage,
    MessagePart,
    TaskStatus,
    UsageMetadata,
)


def _build_payload(
    method: str, text: str, context_id: str | None
) -> dict[str, Any]:
    msg_id = str(uuid.uuid4())
    params: dict[str, Any] = {
        "message": {
            "messageId": msg_id,
            "role": "user",
            "parts": [{"kind": "text", "text": text}],
        }
    }
    if context_id:
        params["contextId"] = context_id
    return {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": method,
        "params": params,
    }


def _parse_result(result: dict[str, Any]) -> ChatResponse:
    status_raw = result.get("status", {})
    artifacts_raw = result.get("artifacts", [])
    history_raw = result.get("history", [])
    metadata = result.get("metadata", {})
    usage_raw = metadata.get("kagent_usage_metadata")

    artifacts = []
    for a in artifacts_raw:
        parts = [MessagePart(**p) for p in a.get("parts", [])]
        artifacts.append(Artifact(artifactId=a.get("artifactId", ""), parts=parts))

    history = []
    for h in history_raw:
        parts = [MessagePart(**p) for p in h.get("parts", [])]
        history.append(
            HistoryMessage(
                kind=h.get("kind", "message"),
                role=h.get("role", ""),
                messageId=h.get("messageId", ""),
                parts=parts,
            )
        )

    usage = UsageMetadata(**usage_raw) if usage_raw else None

    return ChatResponse(
        task_id=result.get("id", ""),
        context_id=result.get("contextId", ""),
        status=TaskStatus(**status_raw),
        artifacts=artifacts,
        history=history,
        usage=usage,
    )


async def send_message(
    agent_name: str, text: str, context_id: str | None = None
) -> ChatResponse:
    payload = _build_payload("message/send", text, context_id)
    url = settings.kagent_agent_base_url

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        body = resp.json()

    if "error" in body:
        raise RuntimeError(f"A2A error: {body['error']}")

    return _parse_result(body.get("result", {}))


async def stream_message(
    agent_name: str, text: str, context_id: str | None = None
) -> AsyncIterator[dict[str, Any]]:
    payload = _build_payload("message/stream", text, context_id)
    url = settings.kagent_agent_base_url

    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            buffer = ""
            async for chunk in resp.aiter_text():
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if line.startswith("data:"):
                        data_str = line[len("data:"):].strip()
                        if data_str:
                            import json
                            try:
                                event = json.loads(data_str)
                                yield event
                            except json.JSONDecodeError:
                                pass
