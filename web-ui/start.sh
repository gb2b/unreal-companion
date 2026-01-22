#!/bin/bash
# start.sh - Lance Unreal Companion

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Unreal Companion..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Backend
echo -e "${BLUE}Starting backend...${NC}"
cd "$SCRIPT_DIR/server"

# Create venv if needed
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

python main.py &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait for backend
sleep 2

# Frontend
echo -e "${BLUE}Starting frontend...${NC}"

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✅ Unreal Companion is running!${NC}"
echo ""
echo "  Web UI:   http://localhost:3179"
echo "  API Docs: http://localhost:3179/docs"
echo ""
echo "  (Optional vhost: http://unreal-companion.local:3179)"
echo "  Add to /etc/hosts: 127.0.0.1 unreal-companion.local"
echo ""
echo "Press Ctrl+C to stop"

# Wait
wait
