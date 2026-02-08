# Agent UI Backend — Kubernetes Resources

Kubernetes resource definitions for the agent-ui backend (FastAPI/Uvicorn).

## Image

```
852893458518.dkr.ecr.us-east-2.amazonaws.com/agent-ui-backend:latest
```

## Namespace

Deploy into the `kagent` namespace alongside the kagent controller and agent pods.

## Resources

### 1. ConfigMap

Non-sensitive runtime configuration injected as environment variables.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-ui-backend
  namespace: kagent
  labels:
    app: agent-ui-backend
    component: backend
data:
  KAGENT_CONTROLLER_URL: "http://kagent-controller.kagent.svc.cluster.local:8083"
  KAGENT_AGENT_URL_TEMPLATE: "http://{name}.kagent.svc.cluster.local:8080"
  CORS_ORIGINS: '["http://agent-ui-frontend.kagent.svc.cluster.local"]'
  AGENT_CACHE_TTL_SECONDS: "60"
```

**Field reference:**

| Variable | Description | Default |
|----------|-------------|---------|
| `KAGENT_CONTROLLER_URL` | kagent controller API base URL | `http://kagent-controller.kagent.svc.cluster.local:8083` |
| `KAGENT_AGENT_URL_TEMPLATE` | Per-agent A2A endpoint template. `{name}` is replaced with the agent name at runtime. | `http://{name}.kagent.svc.cluster.local:8080` |
| `CORS_ORIGINS` | JSON array of allowed CORS origins | `["http://localhost:5173"]` |
| `AGENT_CACHE_TTL_SECONDS` | Seconds between agent list cache refreshes | `60` |

### 2. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-ui-backend
  namespace: kagent
  labels:
    app: agent-ui-backend
    component: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent-ui-backend
  template:
    metadata:
      labels:
        app: agent-ui-backend
        component: backend
    spec:
      containers:
        - name: backend
          image: 852893458518.dkr.ecr.us-east-2.amazonaws.com/agent-ui-backend:latest
          ports:
            - name: http
              containerPort: 8000
              protocol: TCP
          envFrom:
            - configMapRef:
                name: agent-ui-backend
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /api/agents
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/agents
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
```

### 3. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-ui-backend
  namespace: kagent
  labels:
    app: agent-ui-backend
    component: backend
spec:
  type: ClusterIP
  selector:
    app: agent-ui-backend
  ports:
    - name: http
      port: 8000
      targetPort: 8000
      protocol: TCP
```

## Network Dependencies

The backend must be able to reach:

| Target | URL Pattern | Purpose |
|--------|-------------|---------|
| kagent controller | `http://kagent-controller.kagent.svc.cluster.local:8083` | Agent discovery, session management, agent creation |
| Agent pods | `http://{agent-name}.kagent.svc.cluster.local:8080` | A2A protocol (message/send, message/stream) |

## Notes

- The backend has no persistent storage; all state is in-memory (agent cache) or proxied from the kagent controller.
- SSE streaming connections to agent pods can last up to 300s. If using a service mesh or network policy, ensure long-lived HTTP connections are not terminated prematurely.
- The `/api/agents` endpoint is used for both readiness and liveness probes since it exercises the controller connection and cache.
