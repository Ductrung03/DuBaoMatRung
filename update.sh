#!/bin/bash

# =============================================================================
# Auto Deploy Script for DuBaoMatRung Project
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_DIR="$HOME/DuBaoMatRung"
CLIENT_DIR="$PROJECT_DIR/client"
SERVER_DIR="$PROJECT_DIR/server"
BACKUP_DIR="$HOME/backups"
BRANCH="main" # Change this if using different branch

# Logging
LOG_FILE="$PROJECT_DIR/deploy.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Functions
log() {
    echo -e "${GREEN}[$DATE]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$DATE] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$DATE] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$DATE] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if not exists
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Backup current version
backup_current_version() {
    info "Creating backup of current version..."
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    if [ -d "$PROJECT_DIR" ]; then
        cp -r "$PROJECT_DIR" "$BACKUP_PATH"
        log "Backup created: $BACKUP_PATH"
    else
        warning "Project directory not found, skipping backup"
    fi
}

# Check if git is available
check_git() {
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install git first."
        exit 1
    fi
}

# Check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        error "NPM is not installed. Please install Node.js and npm first."
        exit 1
    fi
}

# Check if PM2 is available
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            log "PM2 installed successfully"
        else
            error "Failed to install PM2"
            exit 1
        fi
    fi
}

# Pull latest code
pull_code() {
    info "Pulling latest code from repository..."
    cd "$PROJECT_DIR" || exit 1
    
    # Stash any local changes
    git stash push -m "Auto stash before update $(date)"
    
    # Fetch latest changes
    git fetch origin
    
    # Check if there are updates
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        info "Already up to date. No changes to pull."
        return 0
    fi
    
    # Pull changes
    git pull origin "$BRANCH"
    if [ $? -eq 0 ]; then
        log "Code pulled successfully"
        return 0
    else
        error "Failed to pull code"
        return 1
    fi
}

# Install/Update dependencies
update_dependencies() {
    info "Updating dependencies..."
    
    # Update server dependencies
    info "Updating server dependencies..."
    cd "$SERVER_DIR" || exit 1
    npm install
    if [ $? -ne 0 ]; then
        error "Failed to update server dependencies"
        return 1
    fi
    
    # Update client dependencies
    info "Updating client dependencies..."
    cd "$CLIENT_DIR" || exit 1
    npm install
    if [ $? -ne 0 ]; then
        error "Failed to update client dependencies"
        return 1
    fi
    
    log "Dependencies updated successfully"
    return 0
}

# Build client (if needed)
build_client() {
    info "Building client application..."
    cd "$CLIENT_DIR" || exit 1
    
    # Check if build script exists
    if npm run | grep -q "build"; then
        npm run build
        if [ $? -eq 0 ]; then
            log "Client built successfully"
        else
            error "Failed to build client"
            return 1
        fi
    else
        info "No build script found, skipping build step"
    fi
    return 0
}

# Stop services
stop_services() {
    info "Stopping services..."
    
    # Stop PM2 processes
    pm2 stop all 2>/dev/null || warning "No PM2 processes to stop"
    
    # Stop any processes running on ports 3000 and 5173
    fuser -k 3000/tcp 2>/dev/null || true
    fuser -k 5173/tcp 2>/dev/null || true
    
    sleep 2
    log "Services stopped"
}

# Start services
start_services() {
    info "Starting services..."
    
    # Create PM2 ecosystem file if not exists
    create_pm2_config
    
    # Start with PM2
    cd "$PROJECT_DIR" || exit 1
    pm2 start ecosystem.config.js
    
    if [ $? -eq 0 ]; then
        pm2 save
        log "Services started successfully with PM2"
    else
        error "Failed to start services with PM2"
        # Fallback: start manually
        start_services_manual
    fi
}

# Create PM2 configuration
create_pm2_config() {
    PM2_CONFIG="$PROJECT_DIR/ecosystem.config.js"
    if [ ! -f "$PM2_CONFIG" ]; then
        info "Creating PM2 configuration..."
        cat > "$PM2_CONFIG" << EOF
module.exports = {
  apps: [{
    name: 'dubaomatrung-server',
    cwd: './server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/server-error.log',
    out_file: './logs/server-out.log',
    log_file: './logs/server-combined.log',
    time: true
  }, {
    name: 'dubaomatrung-client',
    cwd: './client',
    script: 'npm',
    args: 'run dev -- --host 0.0.0.0 --port 5173',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/client-error.log',
    out_file: './logs/client-out.log',
    log_file: './logs/client-combined.log',
    time: true
  }]
}
EOF
        
        # Create logs directory
        mkdir -p "$PROJECT_DIR/logs"
        log "PM2 configuration created"
    fi
}

# Manual service start (fallback)
start_services_manual() {
    warning "Starting services manually as fallback..."
    
    # Start server in background
    cd "$SERVER_DIR" || exit 1
    nohup npm run start > "$PROJECT_DIR/logs/server.log" 2>&1 &
    SERVER_PID=$!
    
    # Start client in background
    cd "$CLIENT_DIR" || exit 1
    nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$PROJECT_DIR/logs/client.log" 2>&1 &
    CLIENT_PID=$!
    
    # Save PIDs
    echo $SERVER_PID > "$PROJECT_DIR/server.pid"
    echo $CLIENT_PID > "$PROJECT_DIR/client.pid"
    
    sleep 5
    
    # Check if processes are running
    if kill -0 $SERVER_PID 2>/dev/null && kill -0 $CLIENT_PID 2>/dev/null; then
        log "Services started manually (Server PID: $SERVER_PID, Client PID: $CLIENT_PID)"
    else
        error "Failed to start services manually"
        return 1
    fi
}

# Check service status
check_status() {
    info "Checking service status..."
    
    # Check if ports are listening
    if netstat -tlnp | grep -q ":3000 "; then
        log "✅ Server is running on port 3000"
    else
        error "❌ Server is not running on port 3000"
    fi
    
    if netstat -tlnp | grep -q ":5173 "; then
        log "✅ Client is running on port 5173"
    else
        error "❌ Client is not running on port 5173"
    fi
    
    # Show PM2 status
    pm2 status 2>/dev/null || warning "PM2 status not available"
}

# Health check
health_check() {
    info "Performing health check..."
    
    # Wait for services to start
    sleep 10
    
    # Check server health
    if curl -f -s http://localhost:3000 > /dev/null; then
        log "✅ Server health check passed"
    else
        warning "⚠️  Server health check failed"
    fi
    
    # Check client health
    if curl -f -s http://localhost:5173 > /dev/null; then
        log "✅ Client health check passed"
    else
        warning "⚠️  Client health check failed"
    fi
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    info "Cleaning up old backups..."
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR" || return
        ls -t | tail -n +6 | xargs -r rm -rf
        log "Old backups cleaned up (kept latest 5)"
    fi
}

# Main deployment function
deploy() {
    log "========================================="
    log "Starting deployment process..."
    log "========================================="
    
    # Pre-checks
    check_git
    check_npm
    check_pm2
    
    # Create backup
    create_backup_dir
    backup_current_version
    
    # Update code
    if ! pull_code; then
        error "Code update failed, aborting deployment"
        exit 1
    fi
    
    # Update dependencies
    if ! update_dependencies; then
        error "Dependency update failed, aborting deployment"
        exit 1
    fi
    
    # Build client
    build_client
    
    # Restart services
    stop_services
    start_services
    
    # Health check
    health_check
    check_status
    
    # Cleanup
    cleanup_backups
    
    log "========================================="
    log "Deployment completed successfully!"
    log "========================================="
    info "Access your application at:"
    info "🌐 Frontend: http://103.57.223.237:5173"
    info "🔧 Backend:  http://103.57.223.237:3000"
    info "📚 API Docs: http://103.57.223.237:3000/api-docs"
}

# Rollback function
rollback() {
    warning "Starting rollback process..."
    
    # Get latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
        exit 1
    fi
    
    warning "Rolling back to: $LATEST_BACKUP"
    
    # Stop current services
    stop_services
    
    # Restore from backup
    rm -rf "$PROJECT_DIR"
    cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$PROJECT_DIR"
    
    # Start services
    start_services
    
    log "Rollback completed successfully!"
}

# Show help
show_help() {
    echo -e "${WHITE}Usage: $0 [OPTION]${NC}"
    echo ""
    echo -e "${CYAN}OPTIONS:${NC}"
    echo -e "  ${GREEN}deploy${NC}     Deploy latest code (default)"
    echo -e "  ${GREEN}rollback${NC}   Rollback to previous version"
    echo -e "  ${GREEN}status${NC}     Check service status"
    echo -e "  ${GREEN}stop${NC}       Stop all services"
    echo -e "  ${GREEN}start${NC}      Start all services"
    echo -e "  ${GREEN}restart${NC}    Restart all services"
    echo -e "  ${GREEN}logs${NC}       Show application logs"
    echo -e "  ${GREEN}help${NC}       Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  ./update.sh"
    echo "  ./update.sh deploy"
    echo "  ./update.sh rollback"
    echo "  ./update.sh status"
}

# Handle arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "status")
        check_status
        ;;
    "stop")
        stop_services
        ;;
    "start")
        start_services
        ;;
    "restart")
        stop_services
        sleep 3
        start_services
        ;;
    "logs")
        if command -v pm2 &> /dev/null; then
            pm2 logs --lines 50
        else
            echo "Recent server logs:"
            tail -n 20 "$PROJECT_DIR/logs/server.log" 2>/dev/null || echo "No server logs found"
            echo ""
            echo "Recent client logs:"
            tail -n 20 "$PROJECT_DIR/logs/client.log" 2>/dev/null || echo "No client logs found"
        fi
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac