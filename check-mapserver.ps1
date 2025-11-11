# ====================================================================
# CHECK MAPSERVER - Debug MapServer Issues
# ====================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "CHECKING MAPSERVER SERVICE" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if MapServer container is running
Write-Host "[1/4] Checking MapServer container status..." -ForegroundColor Yellow
$mapserverContainer = docker ps --filter "name=dubaomatrung-mapserver" --format "{{.Status}}"

if ($mapserverContainer) {
    Write-Host "  [OK] Container status: $mapserverContainer" -ForegroundColor Green
} else {
    Write-Host "  [X] MapServer container is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Starting MapServer container..." -ForegroundColor Yellow
    docker-compose up -d mapserver-service
    Start-Sleep -Seconds 10
}

# Check MapServer logs
Write-Host ""
Write-Host "[2/4] MapServer recent logs:" -ForegroundColor Yellow
docker logs --tail 30 dubaomatrung-mapserver 2>&1

# Check if port 3007 is listening
Write-Host ""
Write-Host "[3/4] Checking if MapServer port 3007 is listening..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3007/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] MapServer is responding on port 3007" -ForegroundColor Green
} catch {
    Write-Host "  [X] MapServer is NOT responding on port 3007" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Check Gateway logs for mapserver routes
Write-Host ""
Write-Host "[4/4] Gateway recent logs (filtering for mapserver):" -ForegroundColor Yellow
docker logs --tail 50 dubaomatrung-gateway 2>&1 | Select-String -Pattern "mapserver" -Context 2

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "If MapServer is not working, try:" -ForegroundColor Yellow
Write-Host "  1. Restart MapServer: docker-compose restart mapserver-service" -ForegroundColor Gray
Write-Host "  2. Check MapServer files exist: ls mapserver/mapfiles/" -ForegroundColor Gray
Write-Host "  3. Rebuild MapServer: docker-compose build mapserver-service && docker-compose up -d mapserver-service" -ForegroundColor Gray
Write-Host "  4. Check Gateway routes: docker exec dubaomatrung-gateway cat /app/src/index.js | grep mapserver" -ForegroundColor Gray
Write-Host ""
