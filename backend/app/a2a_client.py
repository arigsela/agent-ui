from __future__ import annotations

import json
import logging
import uuid
from typing import Any, AsyncIterator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)
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
    message: dict[str, Any] = {
        "kind": "message",
        "messageId": msg_id,
        "role": "user",
        "parts": [{"kind": "text", "text": text}],
    }
    if context_id:
        message["contextId"] = context_id
    params: dict[str, Any] = {"message": message}
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


def _agent_url(agent_name: str) -> str:
    return settings.kagent_agent_url_template.format(name=agent_name)


async def send_message(
    agent_name: str, text: str, context_id: str | None = None
) -> ChatResponse:
    payload = _build_payload("message/send", text, context_id)
    url = _agent_url(agent_name)

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
    url = _agent_url(agent_name)

    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            logger.info("Stream content-type: %s", content_type)

            if "text/event-stream" in content_type:
                # True SSE stream — parse data: lines
                buffer = ""
                async for chunk in resp.aiter_text():
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if line.startswith("data:"):
                            data_str = line[len("data:"):].strip()
                            if data_str:
                                try:
                                    event = json.loads(data_str)
                                    kind = event.get("result", event).get("kind", "?")
                                    logger.info("SSE event: kind=%s", kind)
                                    yield event
                                except json.JSONDecodeError:
                                    logger.warning("Malformed SSE data: %s", data_str[:200])
            else:
                # Agent returned a regular JSON response — synthesize events
                body_bytes = await resp.aread()
                body = json.loads(body_bytes)
                logger.info("Non-SSE response, synthesizing events from JSON")
                result = body.get("result", body)
                context_id = result.get("contextId")

                # Emit a status-update
                status = result.get("status", {})
                yield {
                    "result": {
                        "kind": "status-update",
                        "contextId": context_id,
                        "status": status,
                        "final": False,
                    }
                }

                # Emit artifacts
                for artifact in result.get("artifacts", []):
                    yield {
                        "result": {
                            "kind": "artifact",
                            "contextId": context_id,
                            "artifact": artifact,
                            "final": True,
                        }
                    }

                # Emit history and usage as a custom event
                history = result.get("history", [])
                metadata = result.get("metadata", {})
                if history or metadata:
                    yield {
                        "result": {
                            "kind": "metadata",
                            "contextId": context_id,
                            "history": history,
                            "metadata": metadata,
                        }
                    }
