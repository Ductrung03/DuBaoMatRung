#!/bin/bash

# =============================================================================
# Simple Update Script for DuBaoMatRung Project
# =============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting update...${NC}"

# Go to project directory
cd ~/DuBaoMatRung

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git stash
git pull origin main

# Update server dependencies
echo -e "${YELLOW}📦 Updating server dependencies...${NC}"
cd server
npm install

# Update client dependencies  
echo -e "${YELLOW}📦 Updating client dependencies...${NC}"
cd ../client
npm install

# Stop running processes
echo -e "${YELLOW}🛑 Stopping services...${NC}"
pm2 stop all 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

sleep 3

# Start server
echo -e "${YELLOW}🔧 Starting server...${NC}"
cd ../server
pm2 start server.js --name "server" 2>/dev/null || nohup node server.js > ../logs/server.log 2>&1 &

# Start client
echo -e "${YELLOW}🌐 Starting client...${NC}"
cd ../client
pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name "client" 2>/dev/null || nohup npm run dev -- --host 0.0.0.0 --port 5173 > ../logs/client.log 2>&1 &

# Save PM2 processes
pm2 save 2>/dev/null || true

sleep 5

# Check if services are running
echo -e "${YELLOW}🔍 Checking services...${NC}"
if netstat -tlnp | grep -q ":3000 "; then
    echo -e "${GREEN}✅ Server running on port 3000${NC}"
else
    echo -e "${RED}❌ Server not running${NC}"
fi

if netstat -tlnp | grep -q ":5173 "; then
    echo -e "${GREEN}✅ Client running on port 5173${NC}"
else
    echo -e "${RED}❌ Client not running${NC}"
fi

echo -e "${GREEN}🎉 Update completed!${NC}"
echo -e "🌐 Frontend: http://103.57.223.237:5173"
echo -e "🔧 Backend:  http://103.57.223.237:3000"