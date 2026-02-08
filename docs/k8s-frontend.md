# Agent UI Frontend — Kubernetes Resources

Kubernetes resource definitions for the agent-ui frontend (Nginx serving React SPA).

## Image

```
852893458518.dkr.ecr.us-east-2.amazonaws.com/agent-ui-frontend:latest
```

## Namespace

Deploy into the `kagent` namespace alongside the backend.

## Resources

### 1. ConfigMap (Nginx config)

The frontend image ships with a default `nginx.conf` that proxies `/api/` to `http://backend:8000`. In Kubernetes the backend service name is `agent-ui-backend`, so we override the config via a ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-ui-frontend-nginx
  namespace: kagent
  labels:
    app: agent-ui-frontend
    component: frontend
data:
  default.conf: |
    server {
        listen 80;

        root /usr/share/nginx/html;
        index index.html;

        location /api/ {
            proxy_pass http://agent-ui-backend.kagent.svc.cluster.local:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Connection '';

            # SSE streaming support
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 300s;
            chunked_transfer_encoding on;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
```

**Key settings:**
- `proxy_pass` points to the backend K8s Service FQDN.
- `proxy_buffering off` and `proxy_read_timeout 300s` are required for SSE streaming responses to flow through without being buffered or timed out.
- `try_files ... /index.html` enables client-side routing (React Router).

### 2. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-ui-frontend
  namespace: kagent
  labels:
    app: agent-ui-frontend
    component: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: agent-ui-frontend
  template:
    metadata:
      labels:
        app: agent-ui-frontend
        component: frontend
    spec:
      containers:
        - name: frontend
          image: 852893458518.dkr.ecr.us-east-2.amazonaws.com/agent-ui-frontend:latest
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 3
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 30
      volumes:
        - name: nginx-config
          configMap:
            name: agent-ui-frontend-nginx
```

### 3. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-ui-frontend
  namespace: kagent
  labels:
    app: agent-ui-frontend
    component: frontend
spec:
  type: ClusterIP
  selector:
    app: agent-ui-frontend
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
```

### 4. Ingress (optional)

If external access is needed, expose the frontend via an Ingress. Adjust the `ingressClassName` and TLS settings for your cluster.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agent-ui
  namespace: kagent
  labels:
    app: agent-ui-frontend
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
spec:
  ingressClassName: nginx
  rules:
    - host: agent-ui.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: agent-ui-frontend
                port:
                  number: 80
```

**Ingress notes:**
- The `proxy-read-timeout` and `proxy-buffering` annotations are needed for SSE streams that pass through the frontend nginx to the backend.
- Replace `agent-ui.example.com` with your actual hostname.
- Add TLS configuration as appropriate for your environment.

## Network Dependencies

| Target | URL Pattern | Purpose |
|--------|-------------|---------|
| agent-ui-backend | `http://agent-ui-backend.kagent.svc.cluster.local:8000` | API proxy (all `/api/` requests) |

## Local Access (port-forward)

For quick access without an Ingress:

```bash
kubectl port-forward -n kagent svc/agent-ui-frontend 3000:80
# Open http://localhost:3000
```

## Notes

- The frontend is a static SPA served by Nginx. All API calls go through the `/api/` proxy to the backend — the browser never contacts the kagent controller or agent pods directly.
- The Nginx ConfigMap is mounted as a volume to override the Docker image's baked-in config, allowing the backend service name to be set correctly for the K8s environment.
- Resource requests are intentionally small since Nginx serving static files is very lightweight.
