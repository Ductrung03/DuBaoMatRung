#!/bin/bash
# DuBaoMatRung - Docker Start Script
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[docker-start]${NC} $1"; }
warn() { echo -e "${YELLOW}[docker-start]${NC} $1"; }
error() { echo -e "${RED}[docker-start]${NC} $1"; }

# Check .env exists
if [ ! -f ".env" ]; then
  warn ".env not found. Copying from .env.docker..."
  cp .env.docker .env
  warn "Please review .env and update secrets before production use!"
fi

# Build images
log "Building Docker images..."
docker compose build

# Start infrastructure first
log "Starting infrastructure (PostgreSQL, Redis, MongoDB)..."
docker compose up -d postgres redis mongodb

log "Waiting for PostgreSQL to be healthy..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  printf "."
  sleep 2
done
echo ""
log "PostgreSQL is ready."

# Start all services
log "Starting all microservices..."
docker compose up -d

log "Waiting for gateway to be healthy..."
MAX_WAIT=120
WAITED=0
until curl -sf http://localhost:${APP_PORT:-3000}/health > /dev/null 2>&1; do
  printf "."
  sleep 3
  WAITED=$((WAITED + 3))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    error "Gateway did not become healthy within ${MAX_WAIT}s."
    error "Check logs with: docker compose logs gateway"
    exit 1
  fi
done
echo ""

log "All services started successfully!"
log "Application is available at: http://localhost:${APP_PORT:-3000}"
log "API Docs: http://localhost:${APP_PORT:-3000}/api-docs"
log ""
log "Useful commands:"
log "  docker compose ps          - View service status"
log "  docker compose logs -f     - Follow all logs"
log "  docker compose logs -f gateway  - Follow gateway logs"
log "  docker compose down        - Stop all services"
log "  docker compose down -v     - Stop and remove volumes (DATA LOSS!)"
