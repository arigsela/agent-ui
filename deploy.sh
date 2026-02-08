#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
KAGENT_NAMESPACE="${KAGENT_NAMESPACE:-kagent}"
CONTROLLER_SVC="${CONTROLLER_SVC:-kagent-controller}"
CONTROLLER_PORT="${CONTROLLER_PORT:-8083}"
AGENT_SVC="${AGENT_SVC:-dnd-agent}"
AGENT_REMOTE_PORT="${AGENT_REMOTE_PORT:-8080}"
AGENT_LOCAL_PORT="${AGENT_LOCAL_PORT:-9090}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

PF_PIDS=()

cleanup() {
    echo ""
    echo "Shutting down..."
    for pid in "${PF_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    docker compose down 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT

# --- Step 1: Port-forwards ---
echo "Starting kubectl port-forwards..."

kubectl port-forward -n "$KAGENT_NAMESPACE" "svc/$CONTROLLER_SVC" "$CONTROLLER_PORT:$CONTROLLER_PORT" &
PF_PIDS+=($!)

kubectl port-forward -n "$KAGENT_NAMESPACE" "svc/$AGENT_SVC" "$AGENT_LOCAL_PORT:$AGENT_REMOTE_PORT" &
PF_PIDS+=($!)

# Give port-forwards a moment to establish
sleep 2

echo "Port-forwards active:"
echo "  Controller: localhost:$CONTROLLER_PORT -> $CONTROLLER_SVC.$KAGENT_NAMESPACE:$CONTROLLER_PORT"
echo "  Agent:      localhost:$AGENT_LOCAL_PORT -> $AGENT_SVC.$KAGENT_NAMESPACE:$AGENT_REMOTE_PORT"

# --- Step 2: Docker Compose ---
echo ""
echo "Building and starting containers..."
docker compose up --build -d

# --- Step 3: Health check ---
echo ""
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "Backend is healthy."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "Backend failed to start within 30s. Check logs with: docker compose logs backend"
        exit 1
    fi
    sleep 1
done

# --- Step 4: Ready ---
echo ""
echo "========================================="
echo "  agent-ui is running!"
echo "  Open http://localhost:$FRONTEND_PORT"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop."

# Wait for interrupt
wait
