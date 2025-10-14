#!/bin/bash

# DuBaoMatRung - Stop All Microservices
# This script stops all running microservices

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
echo -e "${BLUE}  DuBaoMatRung - Stopping All Microservices${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to stop a service by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}Stopping $service_name (PID: $pid)...${NC}"
            kill $pid
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid
            fi
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠ $service_name not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠ No PID file found for $service_name${NC}"
    fi
}

# Stop gateway
echo -e "\n${BLUE}Stopping API Gateway...${NC}"
stop_service_by_pid "API Gateway" "$MICROSERVICES_DIR/gateway/logs/gateway.pid"

# Stop all services
echo -e "\n${BLUE}Stopping backend services...${NC}"
stop_service_by_pid "auth-service" "$MICROSERVICES_DIR/services/auth-service/logs/service.pid"
stop_service_by_pid "user-service" "$MICROSERVICES_DIR/services/user-service/logs/service.pid"
stop_service_by_pid "gis-service" "$MICROSERVICES_DIR/services/gis-service/logs/service.pid"
stop_service_by_pid "report-service" "$MICROSERVICES_DIR/services/report-service/logs/service.pid"
stop_service_by_pid "admin-service" "$MICROSERVICES_DIR/services/admin-service/logs/service.pid"
stop_service_by_pid "search-service" "$MICROSERVICES_DIR/services/search-service/logs/service.pid"
stop_service_by_pid "mapserver-service" "$MICROSERVICES_DIR/services/mapserver-service/logs/service.pid"

# Force kill any remaining node processes related to services
echo -e "\n${YELLOW}Cleaning up any remaining processes...${NC}"
pkill -f "node.*auth-service" || true
pkill -f "node.*user-service" || true
pkill -f "node.*gis-service" || true
pkill -f "node.*report-service" || true
pkill -f "node.*admin-service" || true
pkill -f "node.*search-service" || true
pkill -f "node.*mapserver-service" || true
pkill -f "node.*gateway" || true

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  All services stopped successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
