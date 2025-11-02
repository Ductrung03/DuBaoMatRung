# ===================================================================
# Du Bao Mat Rung - Docker Deployment Script for Windows
# ===================================================================

param(
    [switch]$FirstTime,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Rebuild,
    [switch]$Logs,
    [string]$Service = "",
    [switch]$CleanAll,
    [switch]$Help
)

# Colors for output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Show help
if ($Help) {
    Write-Info @"

===================================================================
Du Bao Mat Rung - Docker Deployment Script
===================================================================

Usage:
  .\deploy.ps1 [OPTIONS]

Options:
  -FirstTime        First time setup (import database, build everything)
  -Stop             Stop all services
  -Restart          Restart all services (no rebuild)
  -Rebuild          Rebuild and restart all services
  -Logs             Show logs (follow mode)
  -Service <name>   Target specific service (use with -Rebuild, -Restart, -Logs)
  -CleanAll         Remove all containers, volumes, and images (DANGEROUS!)
  -Help             Show this help message

Examples:
  # First time deployment
  .\deploy.ps1 -FirstTime

  # Stop all services
  .\deploy.ps1 -Stop

  # Quick restart (no rebuild)
  .\deploy.ps1 -Restart

  # Full rebuild and restart
  .\deploy.ps1 -Rebuild

  # Rebuild specific service
  .\deploy.ps1 -Rebuild -Service "client"

  # View logs
  .\deploy.ps1 -Logs
  .\deploy.ps1 -Logs -Service "auth-service"

  # Clean everything (CAUTION!)
  .\deploy.ps1 -CleanAll

===================================================================
"@
    exit 0
}

# Check if Docker is running
Write-Info "Checking Docker status..."
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running! Please start Docker Desktop first."
    exit 1
}
Write-Success "Docker is running"

# Stop services
if ($Stop) {
    Write-Info "Stopping all services..."
    docker-compose down
    Write-Success "All services stopped"
    exit 0
}

# Clean all
if ($CleanAll) {
    Write-Warning "WARNING: This will remove ALL containers, volumes, and images!"
    $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
    if ($confirm -ne "YES") {
        Write-Info "Cancelled"
        exit 0
    }

    Write-Info "Stopping all containers..."
    docker-compose down -v

    Write-Info "Removing all project images..."
    docker images | Select-String "dubaomatrung" | ForEach-Object {
        $imageId = ($_ -split '\s+')[2]
        docker rmi -f $imageId
    }

    Write-Success "Clean completed"
    exit 0
}

# First time setup
if ($FirstTime) {
    Write-Info "====================================================================="
    Write-Info "FIRST TIME SETUP - This will take 10-20 minutes"
    Write-Info "====================================================================="

    # Check if docker-init folder exists
    if (-not (Test-Path "docker-init")) {
        Write-Error "docker-init folder not found!"
        Write-Error "Please make sure database dumps are in docker-init/ folder:"
        Write-Error "  - docker-init/postgres/*.sql"
        Write-Error "  - docker-init/postgis/*.sql"
        Write-Error "  - docker-init/admin-postgis/*.sql"
        exit 1
    }

    Write-Info "Checking database dumps..."
    $dumps = Get-ChildItem -Path "docker-init" -Recurse -Filter "*.sql" | Measure-Object
    if ($dumps.Count -eq 0) {
        Write-Warning "No SQL dumps found in docker-init/"
        Write-Warning "Database will be empty on first run"
    } else {
        Write-Success "Found $($dumps.Count) SQL dump file(s)"
    }

    Write-Info "Step 1/4: Pulling Docker images..."
    docker-compose pull

    Write-Info "Step 2/4: Building services (this may take 10-15 minutes)..."
    docker-compose build --no-cache

    Write-Info "Step 3/4: Starting services..."
    docker-compose up -d

    Write-Info "Step 4/4: Waiting for services to initialize..."
    Write-Info "Database import may take 5-10 minutes for large databases..."
    Start-Sleep -Seconds 10

    # Show status
    docker-compose ps

    Write-Success "====================================================================="
    Write-Success "DEPLOYMENT COMPLETED!"
    Write-Success "====================================================================="
    Write-Info "Frontend: http://localhost:5173"
    Write-Info "Gateway:  http://localhost:3000"
    Write-Info ""
    Write-Info "Check logs: .\deploy.ps1 -Logs"
    Write-Info "Check status: docker-compose ps"
    exit 0
}

# Restart services
if ($Restart) {
    if ($Service) {
        Write-Info "Restarting service: $Service"
        docker-compose restart $Service
        Write-Success "Service $Service restarted"
    } else {
        Write-Info "Restarting all services..."
        docker-compose restart
        Write-Success "All services restarted"
    }
    docker-compose ps
    exit 0
}

# Rebuild services
if ($Rebuild) {
    if ($Service) {
        Write-Info "Rebuilding service: $Service"
        docker-compose build $Service
        docker-compose up -d $Service
        Write-Success "Service $Service rebuilt and restarted"
    } else {
        Write-Info "Rebuilding all services..."
        docker-compose build
        docker-compose up -d
        Write-Success "All services rebuilt and restarted"
    }
    docker-compose ps
    exit 0
}

# Show logs
if ($Logs) {
    if ($Service) {
        Write-Info "Showing logs for: $Service (Ctrl+C to exit)"
        docker-compose logs -f $Service
    } else {
        Write-Info "Showing all logs (Ctrl+C to exit)"
        docker-compose logs -f
    }
    exit 0
}

# Default: Start services
Write-Info "Starting services..."
docker-compose up -d

Write-Success "Services started!"
docker-compose ps

Write-Info ""
Write-Info "Frontend: http://localhost:5173"
Write-Info "Gateway:  http://localhost:3000"
Write-Info ""
Write-Info "Useful commands:"
Write-Info "  .\deploy.ps1 -Logs              # View all logs"
Write-Info "  .\deploy.ps1 -Restart           # Restart services"
Write-Info "  .\deploy.ps1 -Stop              # Stop all services"
Write-Info "  .\deploy.ps1 -Help              # Show all options"
