# ===== REBUILD MAPSERVER AND ADMIN =====

Write-Host "=== REBUILDING MAPSERVER AND ADMIN ===" -ForegroundColor Cyan

# Stop and remove
Write-Host "`n[1] Stopping and removing..." -ForegroundColor Yellow
docker-compose stop mapserver-service admin-service
docker-compose rm -f mapserver-service admin-service
docker rmi -f dubaomatrung-mapserver-service dubaomatrung-admin-service 2>$null

# Rebuild
Write-Host "`n[2] Rebuilding (using Debian base for MapServer, 3-5 minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache mapserver-service admin-service

# Start
Write-Host "`n[3] Starting..." -ForegroundColor Yellow
docker-compose up -d mapserver-service admin-service

# Wait
Write-Host "`n[4] Waiting 20 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check
Write-Host "`n[5] Checking status:" -ForegroundColor Cyan
docker-compose ps | Select-String -Pattern "mapserver|admin"

Write-Host "`n[6] MapServer logs:" -ForegroundColor Cyan
docker-compose logs mapserver-service --tail=15

Write-Host "`n[7] Admin logs:" -ForegroundColor Cyan
docker-compose logs admin-service --tail=15

# Test
Write-Host "`n[8] Testing:" -ForegroundColor Cyan

try {
    $ms = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  MapServer: OK ($($ms.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  MapServer: FAILED" -ForegroundColor Red
}

try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Admin: OK ($($admin.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  Admin: FAILED" -ForegroundColor Red
}

Write-Host "`n=== DONE ===" -ForegroundColor Green
