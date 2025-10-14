#!/bin/bash

# DuBaoMatRung - Start All Microservices
# This script starts all microservices in the correct order

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MICROSERVICES_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  DuBaoMatRung - Starting All Microservices${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if .env file exists
if [ ! -f "$MICROSERVICES_DIR/.env" ]; then
    echo -e "${RED}ERROR: .env file not found in $MICROSERVICES_DIR${NC}"
    exit 1
fi

# Source the main .env file
source "$MICROSERVICES_DIR/.env"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}Waiting for $service_name to be ready...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# Function to start a service
start_service() {
    local service_name=$1
    local service_dir="$MICROSERVICES_DIR/services/$service_name"
    local port=$2
    local log_file="$service_dir/logs/service.log"

    echo -e "${BLUE}Starting $service_name on port $port...${NC}"

    # Check if service directory exists
    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}ERROR: Service directory not found: $service_dir${NC}"
        return 1
    fi

    # Check if port is already in use
    if check_port $port; then
        echo -e "${YELLOW}⚠ Port $port is already in use. Service may already be running.${NC}"
        return 0
    fi

    # Create logs directory if it doesn't exist
    mkdir -p "$service_dir/logs"

    # Start the service in the background
    cd "$service_dir"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies for $service_name...${NC}"
        npm install --silent
    fi

    # Start the service using npm
    if [ "$NODE_ENV" = "development" ]; then
        PORT=$port npm run dev > "$log_file" 2>&1 &
    else
        PORT=$port npm start > "$log_file" 2>&1 &
    fi

    local pid=$!
    echo $pid > "$service_dir/logs/service.pid"

    echo -e "${GREEN}✓ $service_name started (PID: $pid)${NC}"
    echo -e "  Log file: $log_file"

    cd "$MICROSERVICES_DIR"
    sleep 2
}

# Kill any existing services
echo -e "${YELLOW}Checking for existing services...${NC}"
pkill -f "node.*auth-service" || true
pkill -f "node.*user-service" || true
pkill -f "node.*gis-service" || true
pkill -f "node.*report-service" || true
pkill -f "node.*admin-service" || true
pkill -f "node.*search-service" || true
pkill -f "node.*mapserver-service" || true
sleep 2

# Start services in order
echo -e "\n${BLUE}Starting backend services...${NC}\n"

start_service "auth-service" 3001
wait_for_service "http://localhost:3001" "auth-service"

start_service "user-service" 3002
wait_for_service "http://localhost:3002" "user-service"

start_service "gis-service" 3003
wait_for_service "http://localhost:3003" "gis-service"

start_service "report-service" 3004
wait_for_service "http://localhost:3004" "report-service"

start_service "admin-service" 3005
wait_for_service "http://localhost:3005" "admin-service"

start_service "search-service" 3006
wait_for_service "http://localhost:3006" "search-service"

start_service "mapserver-service" 3008
wait_for_service "http://localhost:3008" "mapserver-service"

# Start gateway
echo -e "\n${BLUE}Starting API Gateway...${NC}\n"
cd "$MICROSERVICES_DIR/gateway"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies for gateway...${NC}"
    npm install --silent
fi

mkdir -p logs
if [ "$NODE_ENV" = "development" ]; then
    PORT=3000 npm run dev > logs/gateway.log 2>&1 &
else
    PORT=3000 npm start > logs/gateway.log 2>&1 &
fi

gateway_pid=$!
echo $gateway_pid > logs/gateway.pid
echo -e "${GREEN}✓ API Gateway started (PID: $gateway_pid)${NC}"

# Wait for gateway to be ready
wait_for_service "http://localhost:3000" "API Gateway"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  All services started successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${BLUE}Service URLs:${NC}"
echo -e "  ${GREEN}API Gateway:${NC}     http://localhost:3000"
echo -e "  ${GREEN}API Docs:${NC}        http://localhost:3000/api-docs"
echo -e "  ${GREEN}Auth Service:${NC}    http://localhost:3001/api-docs"
echo -e "  ${GREEN}User Service:${NC}    http://localhost:3002/api-docs"
echo -e "  ${GREEN}GIS Service:${NC}     http://localhost:3003/api-docs"
echo -e "  ${GREEN}Report Service:${NC}  http://localhost:3004/api-docs"
echo -e "  ${GREEN}Admin Service:${NC}   http://localhost:3005/api-docs"
echo -e "  ${GREEN}Search Service:${NC}  http://localhost:3006/api-docs"

echo -e "\n${YELLOW}To stop all services, run:${NC}"
echo -e "  ./scripts/stop-all.sh"
echo -e "\n${YELLOW}To view logs:${NC}"
echo -e "  tail -f gateway/logs/gateway.log"
echo -e "  tail -f services/*/logs/service.log"
echo ""
