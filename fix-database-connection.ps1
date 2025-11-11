# ====================================================================
# FIX DATABASE CONNECTION - Rebuild and Restart Services
# ====================================================================
# This script fixes the DATABASE_URL issue by rebuilding and restarting
# all services with the updated docker-compose.yml configuration
# ====================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX DATABASE CONNECTION - Rebuild and Restart Services" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
Write-Host "[INFO] Checking Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] docker-compose not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Stop all containers
Write-Host ""
Write-Host "[1/5] Stopping all containers..." -ForegroundColor Yellow
docker-compose down
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to stop containers" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All containers stopped" -ForegroundColor Green

# Rebuild all service images (not databases)
Write-Host ""
Write-Host "[2/5] Rebuilding service images..." -ForegroundColor Yellow
Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray
docker-compose build --no-cache gateway auth-service user-service gis-service report-service admin-service search-service mapserver-service client
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to rebuild images" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All service images rebuilt" -ForegroundColor Green

# Start databases first
Write-Host ""
Write-Host "[3/5] Starting database containers..." -ForegroundColor Yellow
docker-compose up -d postgres postgis admin-postgis mongodb redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start databases" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Database containers started" -ForegroundColor Green

# Wait for databases to be healthy
Write-Host ""
Write-Host "[4/5] Waiting for databases to be healthy..." -ForegroundColor Yellow
Write-Host "  This may take 30-60 seconds..." -ForegroundColor Gray
$maxWait = 120
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

# Start all services
Write-Host ""
Write-Host "[5/5] Starting all services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All services started" -ForegroundColor Green

# Wait for services to start
Write-Host ""
Write-Host "Waiting 30 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test services
Write-Host ""
Write-Host "Testing services..." -ForegroundColor Yellow
Write-Host ""

$services = @{
    "Gateway" = "http://localhost:3000/health"
    "Auth" = "http://localhost:3001/health"
    "User" = "http://localhost:3002/health"
    "GIS" = "http://localhost:3003/health"
    "Report" = "http://localhost:3004/health"
    "Admin" = "http://localhost:3005/health"
    "Search" = "http://localhost:3006/health"
    "Frontend" = "http://localhost:5173"
}

$successCount = 0
$failCount = 0

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
    }
}

# Summary
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Result: $successCount OK, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "====================================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Some services failed. Checking logs..." -ForegroundColor Yellow
    Write-Host ""

    # Check logs of failed services
    $failedServices = @()
    foreach ($service in $services.GetEnumerator()) {
        try {
            $response = Invoke-WebRequest -Uri $service.Value -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        } catch {
            $serviceName = $service.Key.ToLower()
            if ($serviceName -ne "frontend") {
                $failedServices += $serviceName + "-service"
            }
        }
    }

    foreach ($failedService in $failedServices) {
        $containerName = "dubaomatrung-" + $failedService.Replace("-service", "")
        Write-Host "$failedService recent logs:" -ForegroundColor Yellow
        docker logs --tail 10 $containerName 2>&1
        Write-Host ""
    }

    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check detailed logs: docker logs -f dubaomatrung-<service-name>" -ForegroundColor Gray
    Write-Host "  2. Check container status: docker ps -a" -ForegroundColor Gray
    Write-Host "  3. If still failing, check .env file has DB_PASSWORD=4" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "All services are running successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now access:" -ForegroundColor Cyan
    Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Gray
    Write-Host "  - Gateway API: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  - Auth API: http://localhost:3001" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To view logs: docker-compose logs -f [service-name]" -ForegroundColor Gray
}

Write-Host ""
