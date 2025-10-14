#!/bin/bash

# Quick development script to start all services using PM2 or concurrently
# This is a simpler alternative to start-all.sh for development

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MICROSERVICES_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Starting All Services (Development Mode)${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}Using PM2 to manage services...${NC}\n"

    cd "$MICROSERVICES_DIR"

    # Start all services with PM2
    echo -e "${YELLOW}Starting auth-service...${NC}"
    cd services/auth-service && pm2 start src/index.js --name auth-service --watch

    echo -e "${YELLOW}Starting user-service...${NC}"
    cd "$MICROSERVICES_DIR/services/user-service" && pm2 start src/index.js --name user-service --watch

    echo -e "${YELLOW}Starting gis-service...${NC}"
    cd "$MICROSERVICES_DIR/services/gis-service" && pm2 start src/index.js --name gis-service --watch

    echo -e "${YELLOW}Starting report-service...${NC}"
    cd "$MICROSERVICES_DIR/services/report-service" && pm2 start src/index.js --name report-service --watch

    echo -e "${YELLOW}Starting admin-service...${NC}"
    cd "$MICROSERVICES_DIR/services/admin-service" && pm2 start src/index.js --name admin-service --watch

    echo -e "${YELLOW}Starting search-service...${NC}"
    cd "$MICROSERVICES_DIR/services/search-service" && pm2 start src/index.js --name search-service --watch

    echo -e "${YELLOW}Starting gateway...${NC}"
    cd "$MICROSERVICES_DIR/gateway" && pm2 start src/index.js --name gateway --watch

    pm2 logs
else
    echo -e "${YELLOW}PM2 not found. Starting services manually...${NC}"
    echo -e "${YELLOW}Tip: Install PM2 with: npm install -g pm2${NC}\n"

    # Use the main start script
    bash "$SCRIPT_DIR/start-all.sh"
fi
