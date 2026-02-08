# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agent-ui is a frontend application for interacting with kagent AI agents deployed in a Kubernetes cluster. The backend integration spec is in `docs/agent-documentation.md`.

## Current State

This project is in early development. There is no source code, build system, or tests yet — only the backend integration documentation. When bootstrapping the project, refer to `docs/agent-documentation.md` for all backend API contracts.

## Architecture

The system has three layers:

1. **Browser (React)** — connects to UI backend via WebSocket or SSE
2. **UI Backend (API Server)** — proxies requests, handles auth, caches agent data, manages sessions
3. **kagent cluster** — controller on port 8083 (agent registry, sessions) and individual agent pods on port 8080 (A2A protocol)

The frontend never talks directly to kagent services; the backend proxies all A2A communication.

### Key Backend APIs

- **Agent discovery**: `GET kagent-controller:8083/api/agents` — lists registered agents
- **Agent card**: `GET <agent-name>:8080/.well-known/agent.json` — agent capabilities and skills
- **Sessions**: `GET kagent-controller:8083/api/sessions` — session management

### A2A Protocol (JSON-RPC 2.0 over HTTP)

All agent communication uses `POST /` to the agent's endpoint:

- `message/send` — synchronous request/response
- `message/stream` — streaming via SSE, events are `status-update` (state transitions: submitted → working → completed/failed) and `artifact` (final response, `final: true` ends stream)

Multi-turn conversations use `contextId` from previous responses. Each message needs a unique `messageId` (UUID).

### Response Structure

- `result.artifacts[].parts[]` — final answer to display
- `result.history[]` — intermediate steps including tool calls
- Parts with `metadata.kagent_type: "function_call"` — tool invocations
- Parts with `metadata.kagent_type: "function_response"` — tool results
- `result.metadata.kagent_usage_metadata` — token usage (promptTokenCount, candidatesTokenCount, totalTokenCount)
