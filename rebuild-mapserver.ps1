# Rebuild MapServer container with fixes
# Use this after fixing the mapfile SRID issue

Write-Host ""
Write-Host "=== REBUILD MAPSERVER CONTAINER ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will stop, remove, and recreate the MapServer container" -ForegroundColor Yellow
Write-Host "with the updated mapfile configuration." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/5] Stopping MapServer container..." -ForegroundColor Yellow
docker-compose stop mapserver-service
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container stopped" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] May not have been running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/5] Removing old container..." -ForegroundColor Yellow
docker-compose rm -f mapserver-service
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Old container removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Rebuilding image (if needed)..." -ForegroundColor Yellow
docker-compose build mapserver-service
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Build successful" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/5] Starting new container..." -ForegroundColor Yellow
docker-compose up -d mapserver-service
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container started" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to start!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/5] Waiting for service to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 10
$retryCount = 0
$serviceReady = $false

while ($retryCount -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3007/health" -Method Get -ErrorAction Stop -TimeoutSec 2
        if ($health.status -eq "ok") {
            $serviceReady = $true
            break
        }
    } catch {
        $retryCount++
        Start-Sleep -Seconds 2
    }
}

if ($serviceReady) {
    Write-Host "  [OK] Service is healthy" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Service may not be ready yet" -ForegroundColor Yellow
    Write-Host "  Check logs: docker logs dubaomatrung-mapserver" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[SUCCESS] MapServer has been rebuilt!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test MapServer: .\test-mapserver.ps1" -ForegroundColor Gray
Write-Host "  2. Refresh browser: http://103.56.160.66:5173" -ForegroundColor Gray
Write-Host "  3. Check map data is now visible" -ForegroundColor Gray
Write-Host ""
Write-Host "If still not working, run: .\fix-mapserver-windows.ps1" -ForegroundColor Cyan
Write-Host ""
