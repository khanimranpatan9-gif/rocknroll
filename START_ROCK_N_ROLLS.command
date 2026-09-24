#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "       ROCK N ROLLS - RESTAURANT ORDERING SYSTEM"
echo "========================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js from https://nodejs.org/ to run this app."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing required npm packages..."
    npm install
else
    echo "[OK] Dependencies are ready."
fi

# Clear any previous processes lingering on port 8080
lsof -ti :8080 | xargs kill -9 2>/dev/null

echo ""
echo "[2/3] Starting Rock N Rolls Server on http://localhost:8080 ..."
node server.js &
SERVER_PID=$!

echo "[3/3] Starting Localtunnel for mobile access..."
node tunnel.js &
TUNNEL_PID=$!

sleep 2

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo ""
echo "========================================================"
echo " All systems launched successfully!"
echo ""
echo " Local / Desktop : http://localhost:8080/"
echo " Mobile (Wi-Fi)  : http://${LOCAL_IP}:8080/"
echo " Admin Portal    : http://localhost:8080/admin"
echo "========================================================"
echo ""

open "http://localhost:8080/" 2>/dev/null
open "http://localhost:8080/admin" 2>/dev/null

echo "Press Ctrl+C to stop all servers."

trap "kill $SERVER_PID $TUNNEL_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT
wait
