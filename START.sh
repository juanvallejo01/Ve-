#!/bin/bash

# USC Connect - Automated Startup Script
# Starts backend (NestJS, port 3002) and the native app (Expo/Metro, port 8081) locally
# No Docker required — uses local PostgreSQL

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  USC CONNECT - Start Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti :3002 | xargs kill -9 2>/dev/null || true
lsof -ti :8081 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Backend
echo -e "${BLUE}Starting Backend (NestJS)...${NC}"
cd "$SCRIPT_DIR/USCback"
npm run start:dev > /tmp/uscback-server.log 2>&1 &
BACKEND_PID=$!
disown $BACKEND_PID

# Wait for backend
for i in $(seq 1 30); do
  if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running on http://localhost:3002/api${NC}"
    break
  fi
  sleep 1
done

# Start Native app (Expo / Metro)
echo -e "${BLUE}Starting Native app (Expo)...${NC}"
cd "$SCRIPT_DIR/uscConnet"
npx expo start > /tmp/uscconnet-expo.log 2>&1 &
EXPO_PID=$!
disown $EXPO_PID

# Wait for Metro bundler
for i in $(seq 1 30); do
  if curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
    echo -e "${GREEN}✓ Expo/Metro running on http://localhost:8081${NC}"
    break
  fi
  sleep 1
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ USConnect is ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  Native app: ${BLUE}http://localhost:8081${NC} (press 'i' / 'a' in the Expo log, or scan the QR)"
echo -e "  Backend:    ${BLUE}http://localhost:3002/api${NC}"
echo ""
echo -e "  ${YELLOW}Login:${NC} student1@usc.edu / UserUSC2026!"
echo -e "  ${YELLOW}Admin:${NC} superadmin@usc.edu / AdminUSC2026!"
echo ""
echo -e "  Logs: tail -f /tmp/uscback-server.log"
echo -e "        tail -f /tmp/uscconnet-expo.log"
echo ""
echo -e "  ${RED}Stop:${NC} lsof -ti :8081,:3002 | xargs kill -9"
echo ""
