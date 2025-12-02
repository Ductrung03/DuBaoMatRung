# =====================================
# Import Initial Data to Docker PostgreSQL
# Run this on Windows Server after starting postgres container
# =====================================

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "dubaomatrung-postgres"
$DATA_DIR = "docker/initial-data"
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "4" }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Import Initial Database Data" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Data directory: $DATA_DIR"
Write-Host ""

# Check if data directory exists
if (-not (Test-Path $DATA_DIR)) {
    Write-Host "Error: Data directory not found!" -ForegroundColor Red
    Write-Host "Please run 'docker/export-current-data.sh' on development machine first." -ForegroundColor Yellow
    exit 1
}

# Check if container is running
$containerRunning = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
if ($containerRunning -ne $CONTAINER_NAME) {
    Write-Host "Error: PostgreSQL container is not running!" -ForegroundColor Red
    Write-Host "Run: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..."
$maxRetries = 30
$retryCount = 0
do {
    $ready = docker exec $CONTAINER_NAME pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) {
        break
    }
    $retryCount++
    Start-Sleep -Seconds 1
} while ($retryCount -lt $maxRetries)

if ($retryCount -eq $maxRetries) {
    Write-Host "Error: PostgreSQL is not ready!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ PostgreSQL is ready" -ForegroundColor Green
Write-Host ""

# Import auth_db
if (Test-Path "$DATA_DIR/auth_db.sql") {
    Write-Host "[1/3] Importing auth_db..." -ForegroundColor Yellow
    Get-Content "$DATA_DIR/auth_db.sql" | docker exec -i $CONTAINER_NAME psql -U postgres -d auth_db
    Write-Host "✓ auth_db imported successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: auth_db.sql not found, skipping..." -ForegroundColor Yellow
}

# Import gis_db
if (Test-Path "$DATA_DIR/gis_db.sql") {
    Write-Host "[2/3] Importing gis_db..." -ForegroundColor Yellow
    Get-Content "$DATA_DIR/gis_db.sql" | docker exec -i $CONTAINER_NAME psql -U postgres -d gis_db
    Write-Host "✓ gis_db imported successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: gis_db.sql not found, skipping..." -ForegroundColor Yellow
}

# Import admin_db
if (Test-Path "$DATA_DIR/admin_db.sql") {
    Write-Host "[3/3] Importing admin_db..." -ForegroundColor Yellow
    Get-Content "$DATA_DIR/admin_db.sql" | docker exec -i $CONTAINER_NAME psql -U postgres -d admin_db
    Write-Host "✓ admin_db imported successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: admin_db.sql not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✓ Import completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: docker-compose up -d" -ForegroundColor Yellow
