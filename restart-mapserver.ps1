# Restart MapServer Service
# This will apply the new connection string changes

$CONTAINER = "dubaomatrung-mapserver"

Write-Host ""
Write-Host "=== RESTART MAPSERVER SERVICE ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Checking if container exists..." -ForegroundColor Yellow

$exists = docker ps -a -q -f name=$CONTAINER
if ([string]::IsNullOrEmpty($exists)) {
    Write-Host "  [ERROR] Container not found!" -ForegroundColor Red
    Write-Host "  Please run: docker-compose up -d" -ForegroundColor Gray
    exit 1
}

Write-Host "  [OK] Container found" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Restarting container..." -ForegroundColor Yellow

docker restart $CONTAINER 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container restarted" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to restart container" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Waiting for service to be ready..." -ForegroundColor Yellow

# Wait 5 seconds
Start-Sleep -Seconds 5

# Check health
$healthCheck = docker exec $CONTAINER node -e "require('http').get('http://localhost:3007/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Service is healthy" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Health check failed, but service may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUCCESS] MapServer service has been restarted!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test WMS endpoint: .\test-mapserver.ps1" -ForegroundColor Gray
Write-Host "  2. Check frontend map display" -ForegroundColor Gray
Write-Host ""
