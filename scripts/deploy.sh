#!/bin/bash

# Deploy script cho Windows Server
# Chạy script này trên server để deploy application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/forest-app"
BACKUP_DIR="$APP_DIR/backups"
LOG_FILE="/var/log/forest-deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Pre-deployment checks
check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running"
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check disk space (minimum 5GB free)
    AVAILABLE_SPACE=$(df $APP_DIR | awk 'NR==2 {print $4}')
    if [ $AVAILABLE_SPACE -lt 5242880 ]; then  # 5GB in KB
        warn "Low disk space: $(($AVAILABLE_SPACE/1024/1024))GB available"
    fi
    
    log "✅ System requirements check passed"
}

# Backup current deployment
backup_current() {
    log "📦 Creating backup of current deployment..."
    
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup database
    if docker-compose -f "$APP_DIR/docker-compose.prod.yml" ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T postgres \
            pg_dump -U forestuser forest_management > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
    fi
    
    # Backup uploads and configuration
    if [ -d "$APP_DIR/server/uploads" ]; then
        cp -r "$APP_DIR/server/uploads" "$BACKUP_DIR/$BACKUP_NAME/"
    fi
    
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$BACKUP_DIR/$BACKUP_NAME/"
    fi
    
    log "✅ Backup created: $BACKUP_NAME"
}

# Update source code
update_source() {
    log "📥 Updating source code..."
    
    cd $APP_DIR
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $(date)"
    
    # Fetch latest changes
    git fetch origin
    
    # Get current and new commit hashes
    OLD_COMMIT=$(git rev-parse HEAD)
    git reset --hard origin/main
    NEW_COMMIT=$(git rev-parse HEAD)
    
    if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
        log "No new changes to deploy"
        return 0
    fi
    
    log "Updated from $OLD_COMMIT to $NEW_COMMIT"
    
    # Show changes
    log "📋 Changes in this deployment:"
    git log --oneline --no-merges $OLD_COMMIT..$NEW_COMMIT | head -10
}

# Build and deploy
deploy_application() {
    log "🚀 Deploying application..."
    
    cd $APP_DIR
    
    # Stop current services gracefully
    log "Stopping current services..."
    docker-compose -f docker-compose.prod.yml down --timeout 30
    
    # Build new images
    log "Building new Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache --parallel
    
    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Health checks
    check_health
}

# Health checks
check_health() {
    log "🏥 Running health checks..."
    
    # Check if containers are running
    CONTAINERS=$(docker-compose -f "$APP_DIR/docker-compose.prod.yml" ps -q)
    for container in $CONTAINERS; do
        if ! docker ps | grep -q $container; then
            error "Container $container is not running"
        fi
    done
    
    # Check backend API
    log "Checking backend API..."
    for i in {1..10}; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            log "✅ Backend API is healthy"
            break
        fi
        if [ $i -eq 10 ]; then
            error "Backend API health check failed"
        fi
        sleep 5
    done
    
    # Check frontend
    log "Checking frontend..."
    for i in {1..10}; do
        if curl -f -s http://localhost:80 > /dev/null; then
            log "✅ Frontend is healthy"
            break
        fi
        if [ $i -eq 10 ]; then
            error "Frontend health check failed"
        fi
        sleep 5
    done
    
    # Check database connection
    log "Checking database connection..."
    if docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T postgres \
        psql -U forestuser -d forest_management -c "SELECT 1;" > /dev/null; then
        log "✅ Database connection is healthy"
    else
        error "Database connection failed"
    fi
}

# Cleanup old images and containers
cleanup() {
    log "🧹 Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR" | tail -n +11 | xargs -r -I {} rm -rf "$BACKUP_DIR/{}"
    fi
    
    log "✅ Cleanup completed"
}

# Rollback function
rollback() {
    error_msg="$1"
    log "🔄 Rolling back deployment due to: $error_msg"
    
    # Get latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to: $LATEST_BACKUP"
    
    # Stop current services
    docker-compose -f "$APP_DIR/docker-compose.prod.yml" down
    
    # Restore database if needed
    if [ -f "$BACKUP_DIR/$LATEST_BACKUP/database.sql" ]; then
        log "Restoring database..."
        docker-compose -f "$APP_DIR/docker-compose.prod.yml" up -d postgres
        sleep 10
        docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T postgres \
            psql -U forestuser -d forest_management < "$BACKUP_DIR/$LATEST_BACKUP/database.sql"
    fi
    
    # Restore files
    if [ -d "$BACKUP_DIR/$LATEST_BACKUP/uploads" ]; then
        rm -rf "$APP_DIR/server/uploads"
        cp -r "$BACKUP_DIR/$LATEST_BACKUP/uploads" "$APP_DIR/server/"
    fi
    
    # Start services
    docker-compose -f "$APP_DIR/docker-compose.prod.yml" up -d
    
    log "✅ Rollback completed"
}

# Main deployment function
main() {
    log "🚀 Starting deployment process..."
    
    # Set up error handling
    trap 'rollback "Script failed at line $LINENO"' ERR
    
    check_requirements
    backup_current
    update_source
    deploy_application
    cleanup
    
    log "🎉 Deployment completed successfully!"
    log "📊 Application status:"
    docker-compose -f "$APP_DIR/docker-compose.prod.yml" ps
}

# Script execution
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [--force] [--no-backup]"
    echo "  --force      Skip confirmation prompts"
    echo "  --no-backup  Skip backup creation (not recommended)"
    exit 0
fi

if [ "$1" != "--force" ]; then
    read -p "Are you sure you want to deploy? This will restart all services. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname $LOG_FILE)"

# Run main deployment
main