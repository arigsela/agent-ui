# kagent UI Backend Integration Guide

This document describes how the backend of a custom UI application should interact with kagent agents deployed in the cluster. It covers agent discovery, the A2A (Agent-to-Agent) protocol, synchronous and streaming communication, session management, and architectural recommendations.

## Cluster Topology

```
┌─────────────────────────────────────────────────────────────────┐
│  kagent namespace                                               │
│                                                                 │
│  ┌─────────────────────┐     ┌──────────────────────────────┐  │
│  │  kagent-controller   │     │  Agent Pods (one per agent)  │  │
│  │  port: 8083          │     │  port: 8080 each             │  │
│  │                      │     │                              │  │
│  │  - Agent registry    │     │  - k8s-agent                 │  │
│  │  - Session mgmt      │     │  - helm-agent                │  │
│  │  - Task history       │     │  - observability-agent       │  │
│  └─────────────────────┘     │  - promql-agent              │  │
│                               │  - cilium-debug-agent        │  │
│                               │  - cilium-manager-agent      │  │
│                               │  - cilium-policy-agent       │  │
│                               │  - istio-agent               │  │
│                               │  - kgateway-agent            │  │
│                               │  - argo-rollouts-agent       │  │
│                               └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

There are two layers the backend interacts with:

| Component | Service | Port | Purpose |
|-----------|---------|------|---------|
| Controller | `kagent-controller.kagent.svc.cluster.local` | 8083 | Agent registry, session management |
| Agent pods | `<agent-name>.kagent.svc.cluster.local` | 8080 | A2A protocol endpoint per agent |

## Agent Discovery

### List All Agents

The controller provides a REST API to list all registered agents.

```
GET http://kagent-controller.kagent.svc.cluster.local:8083/api/agents
```

**Response:**

```json
{
  "error": false,
  "data": [
    {
      "id": "kagent__NS__k8s_agent",
      "agent": {
        "metadata": { "name": "k8s-agent", "namespace": "kagent" },
        "spec": {
          "description": "An Kubernetes Expert AI Agent specializing in cluster operations...",
          "type": "Declarative"
        },
        "status": {
          "conditions": [
            { "type": "Ready", "status": "True" },
            { "type": "Accepted", "status": "True" }
          ]
        }
      }
    }
  ]
}
```

The `id` field uses the format `kagent__NS__<agent_name_with_underscores>`.

### Get Agent A2A Card

Each agent exposes a standard A2A agent card describing its capabilities.

```
GET http://<agent-name>.kagent.svc.cluster.local:8080/.well-known/agent.json
```

**Response (example for k8s-agent):**

```json
{
  "name": "k8s_agent",
  "description": "An Kubernetes Expert AI Agent specializing in cluster operations, troubleshooting, and maintenance.",
  "protocolVersion": "0.3.0",
  "preferredTransport": "JSONRPC",
  "url": "http://k8s-agent.kagent:8080",
  "capabilities": {
    "pushNotifications": false,
    "stateTransitionHistory": true,
    "streaming": true
  },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "skills": [
    {
      "id": "cluster-diagnostics",
      "name": "Cluster Diagnostics",
      "description": "The ability to analyze and diagnose Kubernetes Cluster issues.",
      "examples": [
        "What is the status of my cluster?",
        "How can I troubleshoot a failing pod?"
      ],
      "tags": ["cluster", "diagnostics"]
    }
  ]
}
```

The `skills` array is useful for building UI affordances like suggested prompts or agent selection.

## Available Agents

| Agent | Service Name | Description |
|-------|-------------|-------------|
| k8s-agent | `k8s-agent` | Kubernetes cluster operations, troubleshooting, resource management, security audit |
| helm-agent | `helm-agent` | Helm release management and troubleshooting |
| observability-agent | `observability-agent` | Prometheus queries, Grafana dashboards, monitoring |
| promql-agent | `promql-agent` | Natural language to PromQL query generation |
| cilium-debug-agent | `cilium-debug-agent` | Cilium debugging and advanced diagnostics |
| cilium-manager-agent | `cilium-manager-agent` | Cilium installation, configuration, monitoring |
| cilium-policy-agent | `cilium-policy-agent` | CiliumNetworkPolicy creation from natural language |
| istio-agent | `istio-agent` | Istio service mesh operations and troubleshooting |
| kgateway-agent | `kgateway-agent` | kgateway/Envoy API gateway management |
| argo-rollouts-conversion-agent | `argo-rollouts-conversion-agent` | Convert Deployments to Argo Rollouts |

All agent services are in the `kagent` namespace on port `8080`.

## A2A Protocol Communication

kagent agents implement the A2A protocol v0.3.0 using JSON-RPC 2.0 over HTTP. All requests are `POST` to the agent's root endpoint (`/`).

### Synchronous Request: `message/send`

Use this for request-response interactions where the backend waits for the full agent response.

```
POST http://<agent-name>.kagent.svc.cluster.local:8080/
Content-Type: application/json
```

**Request body:**

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "user",
      "parts": [
        { "kind": "text", "text": "List all namespaces in the cluster" }
      ]
    }
  }
}
```

**Response body:**

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "id": "task-uuid",
    "kind": "task",
    "status": {
      "state": "completed",
      "timestamp": "2026-02-08T12:48:46.340444+00:00"
    },
    "contextId": "context-uuid",
    "artifacts": [
      {
        "artifactId": "artifact-uuid",
        "parts": [
          { "kind": "text", "text": "Here are all the namespaces..." }
        ]
      }
    ],
    "history": [
      {
        "kind": "message",
        "role": "user",
        "messageId": "msg-001",
        "parts": [{ "kind": "text", "text": "List all namespaces in the cluster" }]
      },
      {
        "kind": "message",
        "role": "agent",
        "messageId": "agent-msg-uuid",
        "parts": [
          { "kind": "text", "text": "I'll list all namespaces for you." },
          {
            "kind": "data",
            "metadata": { "kagent_type": "function_call" },
            "data": {
              "name": "k8s_get_resources",
              "args": { "resource_type": "namespace", "output": "wide" }
            }
          }
        ]
      },
      {
        "kind": "message",
        "role": "agent",
        "messageId": "response-uuid",
        "parts": [{ "kind": "text", "text": "Here are all the namespaces..." }]
      }
    ],
    "metadata": {
      "kagent_app_name": "kagent__NS__k8s_agent",
      "kagent_session_id": "context-uuid",
      "kagent_usage_metadata": {
        "promptTokenCount": 4265,
        "candidatesTokenCount": 606,
        "totalTokenCount": 4871
      }
    }
  }
}
```

**Key response fields:**

| Field | Description |
|-------|-------------|
| `result.status.state` | Task state: `submitted`, `working`, `completed`, `failed` |
| `result.artifacts` | Final agent output (the answer to display to the user) |
| `result.history` | Full conversation including tool calls and intermediate steps |
| `result.contextId` | Session identifier for multi-turn conversations |
| `result.metadata.kagent_usage_metadata` | Token usage for cost tracking |

### Streaming Request: `message/stream`

Use this for real-time UI updates. Returns Server-Sent Events (SSE).

```
POST http://<agent-name>.kagent.svc.cluster.local:8080/
Content-Type: application/json
```

**Request body:**

```json
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "method": "message/stream",
  "params": {
    "message": {
      "messageId": "msg-002",
      "role": "user",
      "parts": [
        { "kind": "text", "text": "How many nodes are in the cluster?" }
      ]
    }
  }
}
```

**Response:** SSE stream with `data:` prefixed JSON lines.

Each SSE event contains a JSON-RPC response. The `result.kind` field indicates the event type:

#### Event: `status-update`

Indicates task state transitions. Use to show progress indicators.

```json
{
  "id": "req-002",
  "jsonrpc": "2.0",
  "result": {
    "kind": "status-update",
    "taskId": "task-uuid",
    "contextId": "context-uuid",
    "final": false,
    "status": {
      "state": "submitted",
      "timestamp": "2026-02-08T13:07:36.798688+00:00"
    }
  }
}
```

State transitions follow this order: `submitted` -> `working` -> `completed` (or `failed`).

#### Event: `artifact`

Contains the final response. The `final: true` flag indicates the stream is complete.

```json
{
  "id": "req-002",
  "jsonrpc": "2.0",
  "result": {
    "kind": "artifact",
    "taskId": "task-uuid",
    "contextId": "context-uuid",
    "final": true,
    "artifact": {
      "artifactId": "artifact-uuid",
      "parts": [
        { "kind": "text", "text": "Your cluster has 3 nodes..." }
      ]
    }
  }
}
```

### Multi-Turn Conversations

To continue a conversation, include the `contextId` from a previous response in subsequent requests:

```json
{
  "jsonrpc": "2.0",
  "id": "req-003",
  "method": "message/send",
  "params": {
    "contextId": "context-uuid-from-previous-response",
    "message": {
      "messageId": "msg-003",
      "role": "user",
      "parts": [
        { "kind": "text", "text": "Which node has the most pods?" }
      ]
    }
  }
}
```

The agent retains context from prior messages in the same `contextId` session.

## Session Management

The controller provides session tracking.

```
GET http://kagent-controller.kagent.svc.cluster.local:8083/api/sessions
```

This can be used to list and manage active conversation sessions.

## Architectural Recommendations

### Backend Service Design

```
┌──────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  Browser  │────>│  UI Backend     │────>│  kagent agents      │
│  (React)  │<────│  (API Server)   │<────│  (A2A over HTTP)    │
│           │     │                 │     │                     │
│  WebSocket│     │  - Auth/AuthZ   │     │  - k8s-agent:8080   │
│  or SSE   │     │  - Agent proxy  │     │  - helm-agent:8080  │
│           │     │  - Session mgmt │     │  - etc.             │
└──────────┘     │  - Rate limiting│     └─────────────────────┘
                  │                 │
                  │  Also talks to: │     ┌─────────────────────┐
                  │                 │────>│  kagent-controller   │
                  │                 │     │  :8083               │
                  └─────────────────┘     │  - Agent discovery   │
                                          │  - Sessions          │
                                          └─────────────────────┘
```

### Recommended Backend Responsibilities

1. **Agent Discovery & Caching**: On startup (and periodically), call the controller's `/api/agents` endpoint. Cache the agent list and expose it to the frontend. Fetch each agent's A2A card from `/.well-known/agent.json` for skills and capabilities metadata.

2. **Request Proxying**: The frontend should never talk directly to kagent services. The backend proxies A2A requests, adding authentication and rate limiting.

3. **Streaming Relay**: For streaming responses, the backend should:
   - Accept a WebSocket or SSE connection from the browser
   - Open an HTTP POST to the agent's `message/stream` endpoint
   - Relay SSE events from the agent to the browser in real-time
   - Parse `status-update` events to track task state

4. **Session/Context Management**: Store the mapping of `contextId` to user sessions. This allows the frontend to resume conversations and display chat history.

5. **Message ID Generation**: Generate unique `messageId` values (UUIDs) for each user message. The A2A protocol requires these to be unique.

6. **Response Parsing**: Extract displayable content from the A2A response:
   - `result.artifacts[].parts[]` — the final answer to show the user
   - `result.history[]` — intermediate steps (tool calls, function responses) for an optional "thinking" view
   - Parts with `metadata.kagent_type: "function_call"` — tool invocations the agent made
   - Parts with `metadata.kagent_type: "function_response"` — tool results

7. **Error Handling**: Check `result.status.state` for `failed` state. JSON-RPC errors use the standard `error` field with `code` and `message`.

### In-Cluster Networking

If the UI backend is deployed in the same cluster, it can reach agents directly via Kubernetes DNS:

```
http://<agent-service>.kagent.svc.cluster.local:8080/
http://kagent-controller.kagent.svc.cluster.local:8083/
```

If deployed outside the cluster, use an ingress or port-forward to expose the controller and agent services.

### Authentication Considerations

The A2A endpoints have no built-in authentication. The UI backend must handle:

- **Frontend auth**: Authenticate users before allowing agent interaction
- **Network policy**: Restrict access to kagent services to only the UI backend namespace
- **Rate limiting**: Prevent abuse since each agent request triggers LLM API calls (with token cost)

### Token Usage Tracking

Each synchronous response includes token usage in `result.metadata.kagent_usage_metadata`:

```json
{
  "promptTokenCount": 4265,
  "candidatesTokenCount": 606,
  "totalTokenCount": 4871
}
```

The backend should aggregate these for cost monitoring and per-user usage tracking.
