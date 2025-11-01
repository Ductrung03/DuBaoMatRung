# ===================================================================
# DOCKER DEPLOYMENT SCRIPT FOR WINDOWS SERVER
# Du Bao Mat Rung System
# ===================================================================

param(
    [switch]$FirstTime,
    [switch]$Rebuild,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$PROJECT_PATH = "C:\DuBaoMatRung"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  DOCKER DEPLOYMENT - DU BAO MAT RUNG" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# FUNCTIONS
# ===================================================================

function Check-Docker {
    Write-Host "=== Checking Docker ===" -ForegroundColor Yellow

    try {
        $dockerVersion = docker --version
        Write-Host "  Docker: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Docker is not installed!" -ForegroundColor Red
        Write-Host "  Install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }

    try {
        docker-compose --version 2>&1 | Out-Null
        Write-Host "  Docker Compose: Available" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Docker Compose is not installed!" -ForegroundColor Red
        exit 1
    }

    try {
        docker info 2>&1 | Out-Null
        Write-Host "  Docker Engine: Running" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Docker Engine is not running!" -ForegroundColor Red
        Write-Host "  Start Docker Desktop and try again" -ForegroundColor Yellow
        exit 1
    }
}

function Setup-Environment {
    Write-Host ""
    Write-Host "=== Setting up environment ===" -ForegroundColor Yellow

    if (-not (Test-Path "$PROJECT_PATH\.env")) {
        Write-Host "  Creating .env file from template..." -ForegroundColor Cyan
        Copy-Item "$PROJECT_PATH\.env.docker" "$PROJECT_PATH\.env"
        Write-Host "  WARNING: Please edit .env file and set:" -ForegroundColor Yellow
        Write-Host "    - DB_PASSWORD" -ForegroundColor Yellow
        Write-Host "    - JWT_SECRET" -ForegroundColor Yellow
    } else {
        Write-Host "  .env file already exists" -ForegroundColor Green
    }
}

function Stop-Containers {
    Write-Host ""
    Write-Host "=== Stopping containers ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH

    try {
        docker-compose down
        Write-Host "  All containers stopped" -ForegroundColor Green
    } catch {
        Write-Host "  No containers running" -ForegroundColor Cyan
    }
}

function Update-Code {
    Write-Host ""
    Write-Host "=== Updating code ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH

    if (Test-Path "$PROJECT_PATH\.git") {
        Write-Host "  Pulling latest code..." -ForegroundColor Cyan
        git fetch origin
        git pull origin main
        Write-Host "  Code updated" -ForegroundColor Green
    } else {
        Write-Host "  Not a git repository - skipping update" -ForegroundColor Yellow
    }
}

function Build-Images {
    param([bool]$ForceRebuild = $false)

    Write-Host ""
    Write-Host "=== Building Docker images ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH

    if ($ForceRebuild) {
        Write-Host "  Building with --no-cache..." -ForegroundColor Cyan
        docker-compose build --no-cache
    } else {
        Write-Host "  Building images..." -ForegroundColor Cyan
        docker-compose build
    }

    Write-Host "  Images built successfully" -ForegroundColor Green
}

function Initialize-Databases {
    Write-Host ""
    Write-Host "=== Initializing databases ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH

    # Start only database services
    Write-Host "  Starting database containers..." -ForegroundColor Cyan
    docker-compose up -d postgres postgis admin-postgis mongodb redis

    # Wait for databases to be ready
    Write-Host "  Waiting for databases to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 15

    # Check health
    $healthy = $false
    $maxRetries = 30
    $retries = 0

    while (-not $healthy -and $retries -lt $maxRetries) {
        $retries++
        Write-Host "  Checking database health (attempt $retries/$maxRetries)..." -ForegroundColor Cyan

        $pgHealth = docker-compose exec -T postgres pg_isready -U postgres 2>&1
        $postgisHealth = docker-compose exec -T postgis pg_isready -U postgres 2>&1
        $adminHealth = docker-compose exec -T admin-postgis pg_isready -U postgres 2>&1
        $mongoHealth = docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" 2>&1
        $redisHealth = docker-compose exec -T redis redis-cli ping 2>&1

        if ($pgHealth -match "accepting connections" -and 
            $postgisHealth -match "accepting connections" -and
            $adminHealth -match "accepting connections" -and
            $mongoHealth -match "ok" -and 
            $redisHealth -match "PONG") {
            $healthy = $true
            Write-Host "  All databases are healthy" -ForegroundColor Green
        } else {
            Start-Sleep -Seconds 3
        }
    }

    if (-not $healthy) {
        Write-Host "  WARNING: Databases may not be fully ready" -ForegroundColor Yellow
    }

    # Create PostGIS extensions
    Write-Host "  Creating PostGIS extensions..." -ForegroundColor Cyan
    docker-compose exec -T postgis psql -U postgres -d gis_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 | Out-Null
    docker-compose exec -T admin-postgis psql -U postgres -d admin_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 | Out-Null
}

function Start-Services {
    Write-Host ""
    Write-Host "=== Starting all services ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH

    Write-Host "  Starting containers..." -ForegroundColor Cyan
    docker-compose up -d

    Write-Host "  All services started" -ForegroundColor Green
}

function Show-Status {
    Write-Host ""
    Write-Host "=== System Status ===" -ForegroundColor Yellow

    Set-Location $PROJECT_PATH
    docker-compose ps

    Write-Host ""
    Write-Host "=== Access Information ===" -ForegroundColor Green
    Write-Host "  Frontend:    http://103.56.161.239:5173" -ForegroundColor Cyan
    Write-Host "  API Gateway: http://103.56.161.239:3000" -ForegroundColor Cyan
    Write-Host "  Swagger:     http://103.56.161.239:3000/api-docs" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "=== Docker Commands ===" -ForegroundColor Yellow
    Write-Host "  View logs:       docker-compose logs -f [service]" -ForegroundColor White
    Write-Host "  Stop services:   docker-compose down" -ForegroundColor White
    Write-Host "  Restart:         docker-compose restart" -ForegroundColor White
    Write-Host "  View status:     docker-compose ps" -ForegroundColor White
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

try {
    if (-not (Test-Path $PROJECT_PATH)) {
        Write-Host "  ERROR: Project directory not found: $PROJECT_PATH" -ForegroundColor Red
        exit 1
    }

    Check-Docker

    if ($Stop) {
        Stop-Containers
        Write-Host ""
        Write-Host "=== SERVICES STOPPED ===" -ForegroundColor Green
        Write-Host ""
        exit 0
    }

    if ($FirstTime) {
        Write-Host ""
        Write-Host "=== FIRST TIME DEPLOYMENT ===" -ForegroundColor Green
        Setup-Environment
        Update-Code
        Build-Images -ForceRebuild $false
        Initialize-Databases
        Start-Services
    } elseif ($Rebuild) {
        Write-Host ""
        Write-Host "=== REBUILD MODE ===" -ForegroundColor Green
        Stop-Containers
        Update-Code
        Build-Images -ForceRebuild $true
        Start-Services
    } else {
        Write-Host ""
        Write-Host "=== UPDATE MODE ===" -ForegroundColor Green
        Stop-Containers
        Update-Code
        Build-Images -ForceRebuild $false
        Start-Services
    }

    Show-Status

    Write-Host ""
    Write-Host "=== DEPLOYMENT SUCCESSFUL! ===" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "=== DEPLOYMENT ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "View logs with: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
