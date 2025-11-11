# ====================================================================
# FIX ALL SERVICES - Complete Rebuild and Restart
# ====================================================================
# This script fixes all services by rebuilding with updated configs:
# - DATABASE_URL for all services
# - MAPSERVER_SERVICE_URL for Gateway
# ====================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX ALL SERVICES - Complete Rebuild and Restart" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Stop all services" -ForegroundColor Gray
Write-Host "  2. Rebuild all service images (with DATABASE_URL + MAPSERVER_URL)" -ForegroundColor Gray
Write-Host "  3. Start databases first" -ForegroundColor Gray
Write-Host "  4. Wait for databases to be healthy" -ForegroundColor Gray
Write-Host "  5. Start all services" -ForegroundColor Gray
Write-Host "  6. Test all services" -ForegroundColor Gray
Write-Host ""
Write-Host "This will take about 10-15 minutes." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

# Check if docker-compose is available
Write-Host ""
Write-Host "[INFO] Checking Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] docker-compose not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Stop all containers
Write-Host ""
Write-Host "[1/7] Stopping all containers..." -ForegroundColor Yellow
docker-compose down
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to stop containers" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All containers stopped" -ForegroundColor Green

# Rebuild all service images (not databases)
Write-Host ""
Write-Host "[2/7] Rebuilding all service images..." -ForegroundColor Yellow
Write-Host "  This will take 10-15 minutes..." -ForegroundColor Gray
Write-Host "  Services: Gateway, Auth, User, GIS, Report, Admin, Search, MapServer, Client" -ForegroundColor Gray
Write-Host ""

docker-compose build --no-cache gateway auth-service user-service gis-service report-service admin-service search-service mapserver-service client

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to rebuild images" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All service images rebuilt" -ForegroundColor Green

# Start databases first
Write-Host ""
Write-Host "[3/7] Starting database containers..." -ForegroundColor Yellow
docker-compose up -d postgres postgis admin-postgis mongodb redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start databases" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Database containers started" -ForegroundColor Green

# Wait for databases to be healthy
Write-Host ""
Write-Host "[4/7] Waiting for databases to be healthy..." -ForegroundColor Yellow
Write-Host "  This may take 60-120 seconds..." -ForegroundColor Gray
$maxWait = 180
$elapsed = 0
$interval = 5

while ($elapsed -lt $maxWait) {
    $allHealthy = $true

    # Check each database
    $databases = @("postgres", "postgis", "admin-postgis", "mongodb", "redis")
    foreach ($db in $databases) {
        $containerName = "dubaomatrung-$db"
        $health = docker inspect --format='{{.State.Health.Status}}' $containerName 2>$null

        if ($health -ne "healthy") {
            $allHealthy = $false
            Write-Host "  $db : $health" -ForegroundColor Gray
            break
        }
    }

    if ($allHealthy) {
        Write-Host "  [OK] All databases are healthy" -ForegroundColor Green
        break
    }

    Write-Host "  Waiting... ($elapsed/$maxWait seconds)" -ForegroundColor Gray
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

if ($elapsed -ge $maxWait) {
    Write-Host "  [WARNING] Databases took too long to become healthy" -ForegroundColor Yellow
    Write-Host "  Continuing anyway..." -ForegroundColor Yellow
}

# Start MapServer first (Gateway depends on it)
Write-Host ""
Write-Host "[5/7] Starting MapServer..." -ForegroundColor Yellow
docker-compose up -d mapserver-service
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start MapServer" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] MapServer started" -ForegroundColor Green
Start-Sleep -Seconds 10

# Start all other services
Write-Host ""
Write-Host "[6/7] Starting all services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All services started" -ForegroundColor Green

# Wait for services to start
Write-Host ""
Write-Host "[7/7] Waiting 45 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# Test services
Write-Host ""
Write-Host "Testing all services..." -ForegroundColor Yellow
Write-Host ""

$services = @{
    "Gateway" = "http://localhost:3000/health"
    "Auth" = "http://localhost:3001/health"
    "User" = "http://localhost:3002/health"
    "GIS" = "http://localhost:3003/health"
    "Report" = "http://localhost:3004/health"
    "Admin" = "http://localhost:3005/health"
    "Search" = "http://localhost:3006/health"
    "MapServer" = "http://localhost:3007/health"
    "Frontend" = "http://localhost:5173"
}

$successCount = 0
$failCount = 0
$failedServices = @()

foreach ($service in $services.GetEnumerator()) {
    try {
        $response = Invoke-WebRequest -Uri $service.Value -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $($service.Key)" -ForegroundColor Green
            $successCount++
        }
    } catch {
        Write-Host "  [X] $($service.Key)" -ForegroundColor Red
        $failCount++
        $failedServices += $service.Key
    }
}

# Summary
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Result: $successCount OK, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "====================================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Failed services: $($failedServices -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Checking logs of failed services..." -ForegroundColor Yellow
    Write-Host ""

    foreach ($failedService in $failedServices) {
        $serviceName = $failedService.ToLower()
        $containerMap = @{
            "gateway" = "dubaomatrung-gateway"
            "auth" = "dubaomatrung-auth"
            "user" = "dubaomatrung-user"
            "gis" = "dubaomatrung-gis"
            "report" = "dubaomatrung-report"
            "admin" = "dubaomatrung-admin"
            "search" = "dubaomatrung-search"
            "mapserver" = "dubaomatrung-mapserver"
            "frontend" = "dubaomatrung-client"
        }

        $containerName = $containerMap[$serviceName]
        if ($containerName) {
            Write-Host "=== $failedService logs ===" -ForegroundColor Yellow
            docker logs --tail 20 $containerName 2>&1
            Write-Host ""
        }
    }

    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check detailed logs: docker logs -f dubaomatrung-<service>" -ForegroundColor Gray
    Write-Host "  2. Check container status: docker ps -a" -ForegroundColor Gray
    Write-Host "  3. Verify .env file has DB_PASSWORD=4" -ForegroundColor Gray
    Write-Host "  4. Try: docker-compose restart <failed-service>" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "🎉 ALL SERVICES ARE RUNNING SUCCESSFULLY! 🎉" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now access:" -ForegroundColor Cyan
    Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Gray
    Write-Host "  - Gateway API: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  - Auth API: http://localhost:3001" -ForegroundColor Gray
    Write-Host "  - MapServer: http://localhost:3007" -ForegroundColor Gray
    Write-Host ""
    Write-Host "API Documentation:" -ForegroundColor Cyan
    Write-Host "  - Gateway: http://localhost:3000/api-docs" -ForegroundColor Gray
    Write-Host "  - Auth: http://localhost:3001/api-docs" -ForegroundColor Gray
    Write-Host "  - User: http://localhost:3002/api-docs" -ForegroundColor Gray
    Write-Host "  - GIS: http://localhost:3003/api-docs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f [service-name]" -ForegroundColor Gray
}

Write-Host ""
