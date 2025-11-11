# ====================================================================
# FIX MAPSERVER - Restart Gateway and MapServer Services
# ====================================================================
# This script fixes the MapServer connection issue by restarting
# Gateway and MapServer with the updated configuration
# ====================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX MAPSERVER CONNECTION" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Stop and rebuild Gateway service (to load new MAPSERVER_SERVICE_URL)" -ForegroundColor Gray
Write-Host "  2. Restart MapServer service" -ForegroundColor Gray
Write-Host "  3. Test MapServer API" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

# Stop Gateway and MapServer
Write-Host ""
Write-Host "[1/5] Stopping Gateway and MapServer..." -ForegroundColor Yellow
docker-compose stop gateway mapserver-service
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to stop services" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Services stopped" -ForegroundColor Green

# Rebuild Gateway (to pick up new environment variable)
Write-Host ""
Write-Host "[2/5] Rebuilding Gateway..." -ForegroundColor Yellow
Write-Host "  This may take 2-3 minutes..." -ForegroundColor Gray
docker-compose build gateway
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to rebuild Gateway" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Gateway rebuilt" -ForegroundColor Green

# Start MapServer first
Write-Host ""
Write-Host "[3/5] Starting MapServer..." -ForegroundColor Yellow
docker-compose up -d mapserver-service
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to start MapServer" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] MapServer started" -ForegroundColor Green

# Wait a bit for MapServer to initialize
Write-Host "  Waiting 10 seconds for MapServer to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Start Gateway
Write-Host ""
Write-Host "[4/5] Starting Gateway..." -ForegroundColor Yellow
docker-compose up -d gateway
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to start Gateway" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Gateway started" -ForegroundColor Green

# Wait for Gateway to initialize
Write-Host "  Waiting 15 seconds for Gateway to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Test services
Write-Host ""
Write-Host "[5/5] Testing services..." -ForegroundColor Yellow
Write-Host ""

# Test Gateway
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Gateway (port 3000)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [X] Gateway (port 3000)" -ForegroundColor Red
}

# Test MapServer directly
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3007/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] MapServer direct (port 3007)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [X] MapServer direct (port 3007)" -ForegroundColor Red
}

# Test MapServer through Gateway (without WMS params, just to test routing)
try {
    # Use a simple WMS GetCapabilities request
    $wmsUrl = "http://localhost:3000/api/mapserver?service=WMS&request=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wmsUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] MapServer via Gateway (WMS GetCapabilities)" -ForegroundColor Green
    }
} catch {
    Write-Host "  [X] MapServer via Gateway" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "RESULT" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed, MapServer should now work in your web app!" -ForegroundColor Green
Write-Host ""
Write-Host "If still having issues:" -ForegroundColor Yellow
Write-Host "  1. Check Gateway logs: docker logs dubaomatrung-gateway" -ForegroundColor Gray
Write-Host "  2. Check MapServer logs: docker logs dubaomatrung-mapserver" -ForegroundColor Gray
Write-Host "  3. Try accessing: http://localhost:3007/health" -ForegroundColor Gray
Write-Host "  4. Try WMS request: http://localhost:3000/api/mapserver?service=WMS&request=GetCapabilities" -ForegroundColor Gray
Write-Host ""
