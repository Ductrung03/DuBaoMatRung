# =====================================
# DuBaoMatRung - One-Command Deploy Script for Windows
# Automated deployment to Windows Server
# =====================================

param(
    [switch]$SkipBuild,
    [switch]$Fresh,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param($Text)
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param($Number, $Text)
    Write-Host "[$Number] $Text" -ForegroundColor Yellow
}

function Write-Success {
    param($Text)
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Write-Error {
    param($Text)
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Write-Info {
    param($Text)
    Write-Host "ℹ $Text" -ForegroundColor Blue
}

if ($Help) {
    Write-Host @"
DuBaoMatRung - Windows Deployment Script

Usage:
    .\deploy-windows.ps1 [options]

Options:
    -Fresh          Clean all data and start fresh deployment
    -SkipBuild      Skip building Docker images (use existing images)
    -Help           Show this help message

Examples:
    .\deploy-windows.ps1                    # Normal deployment
    .\deploy-windows.ps1 -Fresh            # Fresh install (removes all data)
    .\deploy-windows.ps1 -SkipBuild        # Quick restart without rebuild

"@
    exit 0
}

Write-Header "DuBaoMatRung - Deployment Script"

# Check if Docker is installed and running
Write-Step 1 "Checking Docker installation..."
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker is installed (version: $dockerVersion)"
    } else {
        throw "Docker is not running"
    }
} catch {
    Write-Error "Docker is not installed or not running!"
    Write-Info "Please install Docker Desktop for Windows from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check if docker-compose is available
Write-Step 2 "Checking Docker Compose..."
try {
    $composeVersion = docker compose version --short 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker Compose is available (version: $composeVersion)"
    } else {
        throw "Docker Compose not found"
    }
} catch {
    Write-Error "Docker Compose is not available!"
    exit 1
}

# Check if .env file exists
Write-Step 3 "Checking environment configuration..."
if (-not (Test-Path ".env")) {
    Write-Info "Creating .env file from template..."
    if (Test-Path "env.docker.example") {
        Copy-Item "env.docker.example" ".env"
        Write-Success ".env file created"
        Write-Host ""
        Write-Host "⚠ IMPORTANT: Please edit .env file and update:" -ForegroundColor Yellow
        Write-Host "  - DB_PASSWORD" -ForegroundColor Yellow
        Write-Host "  - JWT_SECRET" -ForegroundColor Yellow
        Write-Host "  - REFRESH_TOKEN_SECRET" -ForegroundColor Yellow
        Write-Host "  - SERVER_IP" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Press Enter when ready to continue, or Ctrl+C to exit"
    } else {
        Write-Error "env.docker.example not found!"
        exit 1
    }
} else {
    Write-Success ".env file exists"
}

# Fresh install - remove all data
if ($Fresh) {
    Write-Header "Fresh Installation - Removing All Data"
    Write-Host "⚠ WARNING: This will delete all existing data!" -ForegroundColor Red
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Write-Info "Fresh install cancelled"
        exit 0
    }

    Write-Info "Stopping and removing all containers..."
    docker compose down -v
    Write-Success "All containers and volumes removed"
}

# Stop existing containers
Write-Step 4 "Stopping existing containers..."
docker compose down
Write-Success "Containers stopped"

# Build Docker images
if (-not $SkipBuild) {
    Write-Header "Building Docker Images"
    Write-Info "This may take 10-20 minutes on first run..."

    Write-Step 5 "Building images..."
    docker compose build --parallel

    if ($LASTEXITCODE -eq 0) {
        Write-Success "All images built successfully"
    } else {
        Write-Error "Failed to build images!"
        exit 1
    }
} else {
    Write-Info "Skipping build (using existing images)"
}

# Start infrastructure services first
Write-Header "Starting Infrastructure Services"

Write-Step 6 "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

Write-Info "Waiting for services to be healthy..."
$maxRetries = 60
$retryCount = 0

do {
    $postgresHealth = docker inspect --format='{{.State.Health.Status}}' dubaomatrung-postgres 2>$null
    $redisHealth = docker inspect --format='{{.State.Health.Status}}' dubaomatrung-redis 2>$null

    if ($postgresHealth -eq "healthy" -and $redisHealth -eq "healthy") {
        break
    }

    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
    $retryCount++
} while ($retryCount -lt $maxRetries)

Write-Host ""

if ($retryCount -eq $maxRetries) {
    Write-Error "Services did not become healthy in time!"
    docker compose logs postgres redis
    exit 1
}

Write-Success "PostgreSQL and Redis are healthy"

# Import initial data if available
Write-Step 7 "Checking for initial data..."
if (Test-Path "docker/initial-data") {
    Write-Info "Initial data found, importing..."
    & "docker/import-initial-data.ps1"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Initial data imported"
    } else {
        Write-Error "Failed to import initial data!"
        Write-Info "You can import manually later using: docker/import-initial-data.ps1"
    }
} else {
    Write-Info "No initial data found (docker/initial-data directory missing)"
    Write-Info "Database will be initialized with migrations"
}

# Start all services
Write-Header "Starting All Services"

Write-Step 8 "Starting microservices..."
docker compose up -d

Write-Info "Waiting for all services to start..."
Start-Sleep -Seconds 10

# Check service health
Write-Step 9 "Checking service health..."
$services = @(
    @{Name="Gateway"; Port=3000; Container="dubaomatrung-gateway"},
    @{Name="Auth"; Port=3001; Container="dubaomatrung-auth"},
    @{Name="User"; Port=3002; Container="dubaomatrung-user"},
    @{Name="GIS"; Port=3003; Container="dubaomatrung-gis"},
    @{Name="Report"; Port=3004; Container="dubaomatrung-report"},
    @{Name="Admin"; Port=3005; Container="dubaomatrung-admin"},
    @{Name="Search"; Port=3006; Container="dubaomatrung-search"},
    @{Name="MapServer"; Port=3007; Container="dubaomatrung-mapserver"},
    @{Name="Frontend"; Port=80; Container="dubaomatrung-frontend"}
)

$allHealthy = $true
foreach ($service in $services) {
    $status = docker inspect --format='{{.State.Status}}' $service.Container 2>$null
    if ($status -eq "running") {
        Write-Success "$($service.Name) is running on port $($service.Port)"
    } else {
        Write-Error "$($service.Name) is not running!"
        $allHealthy = $false
    }
}

Write-Header "Deployment Summary"

if ($allHealthy) {
    Write-Success "All services are running successfully!"
    Write-Host ""
    Write-Host "Application URLs:" -ForegroundColor Cyan
    Write-Host "  Frontend:  http://103.56.160.66" -ForegroundColor White
    Write-Host "  API:       http://103.56.160.66:3000" -ForegroundColor White
    Write-Host "  Gateway:   http://103.56.160.66:3000/health" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:         docker compose logs -f" -ForegroundColor White
    Write-Host "  Stop all:          docker compose down" -ForegroundColor White
    Write-Host "  Restart service:   docker compose restart <service-name>" -ForegroundColor White
    Write-Host "  Backup database:   .\docker\backup-databases.sh" -ForegroundColor White
    Write-Host ""
} else {
    Write-Error "Some services failed to start!"
    Write-Info "Check logs with: docker compose logs"
    exit 1
}

Write-Header "Deployment Complete!"
