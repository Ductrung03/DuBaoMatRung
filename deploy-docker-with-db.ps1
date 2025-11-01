# Deploy to Windows Server with Database Import
# This script deploys the entire application with pre-exported databases

param(
    [switch]$Rebuild,
    [switch]$Clean
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Du Bao Mat Rung - Docker Deployment" -ForegroundColor Cyan
Write-Host "  With Database Import" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if database exports exist
Write-Host ""
Write-Host "[2/6] Checking database exports..." -ForegroundColor Yellow

$authDbExist = Test-Path "docker-init/postgres/01-auth-db.sql"
$gisDbExist = Test-Path "docker-init/postgis/01-gis-db.sql"

if (-not $authDbExist) {
    Write-Host "  ✗ Missing: docker-init/postgres/01-auth-db.sql" -ForegroundColor Red
    Write-Host "  Please export databases first on your development machine:" -ForegroundColor Yellow
    Write-Host "    ./export-databases.sh" -ForegroundColor White
    exit 1
}

if (-not $gisDbExist) {
    Write-Host "  ✗ Missing: docker-init/postgis/01-gis-db.sql" -ForegroundColor Red
    Write-Host "  Please export databases first on your development machine:" -ForegroundColor Yellow
    Write-Host "    ./export-databases.sh" -ForegroundColor White
    exit 1
}

Write-Host "  ✓ auth_db export found ($(((Get-Item 'docker-init/postgres/01-auth-db.sql').Length / 1KB).ToString('F2')) KB)" -ForegroundColor Green
Write-Host "  ✓ gis_db export found ($(((Get-Item 'docker-init/postgis/01-gis-db.sql').Length / 1MB).ToString('F2')) MB)" -ForegroundColor Green

# Clean old containers and volumes if requested
if ($Clean) {
    Write-Host ""
    Write-Host "[3/6] Cleaning old deployment..." -ForegroundColor Yellow
    Write-Host "  WARNING: This will delete all data in Docker volumes!" -ForegroundColor Red
    $confirm = Read-Host "  Type 'YES' to confirm"

    if ($confirm -eq "YES") {
        docker-compose down -v
        Write-Host "  ✓ Cleaned containers and volumes" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Cancelled" -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host ""
    Write-Host "[3/6] Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "  ✓ Containers stopped" -ForegroundColor Green
}

# Build or pull images
Write-Host ""
if ($Rebuild) {
    Write-Host "[4/6] Building Docker images..." -ForegroundColor Yellow
    docker-compose build --no-cache
} else {
    Write-Host "[4/6] Building Docker images (using cache)..." -ForegroundColor Yellow
    docker-compose build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Images built successfully" -ForegroundColor Green

# Start services
Write-Host ""
Write-Host "[5/6] Starting services..." -ForegroundColor Yellow
Write-Host "  Note: First run will import databases, this may take 1-2 minutes" -ForegroundColor Cyan

docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Services started" -ForegroundColor Green

# Wait for databases to initialize
Write-Host ""
Write-Host "[6/6] Waiting for databases to initialize..." -ForegroundColor Yellow
Write-Host "  This may take 30-60 seconds on first run..." -ForegroundColor Cyan

$maxWait = 120
$waited = 0
$interval = 5

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds $interval
    $waited += $interval

    # Check if postgres is ready
    $postgresReady = docker exec dubaomatrung-postgres pg_isready -U postgres 2>$null
    $postgisReady = docker exec dubaomatrung-postgis pg_isready -U postgres 2>$null

    if ($postgresReady -match "accepting connections" -and $postgisReady -match "accepting connections") {
        Write-Host "  ✓ Databases are ready!" -ForegroundColor Green
        break
    }

    Write-Host "  ... waiting ($waited/$maxWait seconds)" -ForegroundColor Gray
}

# Show status
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment Status" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

docker-compose ps

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Access URLs" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost" -ForegroundColor White
Write-Host "  Gateway:   http://localhost:3000" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Gray
Write-Host "  PostGIS:   localhost:5433" -ForegroundColor Gray
Write-Host "  MongoDB:   localhost:27017" -ForegroundColor Gray
Write-Host "  Redis:     localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Default Login Credentials" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Useful Commands" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "  View service logs: docker-compose logs -f [service-name]" -ForegroundColor White
Write-Host "  Stop:             docker-compose stop" -ForegroundColor White
Write-Host "  Restart:          docker-compose restart" -ForegroundColor White
Write-Host "  Full cleanup:     docker-compose down -v" -ForegroundColor White
Write-Host ""
Write-Host "Deployment complete! ✓" -ForegroundColor Green
Write-Host ""
