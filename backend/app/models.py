from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# --- Agent Discovery ---

class AgentInfo(BaseModel):
    name: str
    description: str
    ready: bool


class AgentSkill(BaseModel):
    id: str
    name: str
    description: str
    examples: list[str] = []
    tags: list[str] = []


class AgentCapabilities(BaseModel):
    pushNotifications: bool = False
    stateTransitionHistory: bool = False
    streaming: bool = False


class AgentCard(BaseModel):
    name: str
    description: str
    url: str = ""
    skills: list[AgentSkill] = []
    capabilities: AgentCapabilities = AgentCapabilities()


# --- Chat / A2A Protocol ---

class SendRequest(BaseModel):
    agent_name: str
    text: str
    context_id: str | None = None


class MessagePart(BaseModel):
    kind: str
    text: str | None = None
    data: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class Artifact(BaseModel):
    artifactId: str = ""
    parts: list[MessagePart] = []


class HistoryMessage(BaseModel):
    kind: str = "message"
    role: str = ""
    messageId: str = ""
    parts: list[MessagePart] = []


class UsageMetadata(BaseModel):
    promptTokenCount: int = 0
    candidatesTokenCount: int = 0
    totalTokenCount: int = 0


class TaskStatus(BaseModel):
    state: str = ""
    timestamp: str = ""


class ChatResponse(BaseModel):
    task_id: str = ""
    context_id: str = ""
    status: TaskStatus = TaskStatus()
    artifacts: list[Artifact] = []
    history: list[HistoryMessage] = []
    usage: UsageMetadata | None = None


# --- Agent Creation ---

class CreateAgentRequest(BaseModel):
    name: str
    namespace: str = "kagent"
    description: str = ""
    systemMessage: str = ""
    modelConfig: str = "default-model-config"
    stream: bool = True


class CreateAgentResponse(BaseModel):
    name: str
    namespace: str
