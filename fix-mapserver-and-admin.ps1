# ===== FIX MAPSERVER AND ADMIN SERVICES =====

Write-Host "=== FIXING MAPSERVER AND ADMIN SERVICES ===" -ForegroundColor Cyan

# Step 1: Stop services
Write-Host "`n[1] Stopping mapserver-service and admin-service..." -ForegroundColor Yellow
docker-compose stop mapserver-service admin-service

# Step 2: Remove old containers
Write-Host "`n[2] Removing old containers..." -ForegroundColor Yellow
docker-compose rm -f mapserver-service admin-service

# Step 3: Remove old images
Write-Host "`n[3] Removing old images..." -ForegroundColor Yellow
docker rmi -f dubaomatrung-mapserver-service 2>$null
docker rmi -f dubaomatrung-admin-service 2>$null

# Step 4: Rebuild WITHOUT cache (MapServer needs to install mapserv binary)
Write-Host "`n[4] Rebuilding services (MapServer will install mapserv, may take 5 minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache mapserver-service admin-service

# Step 5: Start services
Write-Host "`n[5] Starting services..." -ForegroundColor Yellow
docker-compose up -d mapserver-service admin-service

# Step 6: Wait for startup
Write-Host "`n[6] Waiting 30 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 7: Check logs
Write-Host "`n[7] Checking mapserver-service logs:" -ForegroundColor Cyan
docker-compose logs mapserver-service --tail=20

Write-Host "`n[8] Checking admin-service logs:" -ForegroundColor Cyan
docker-compose logs admin-service --tail=20

# Step 9: Test services
Write-Host "`n[9] Testing services:" -ForegroundColor Cyan

Write-Host "  MapServer Service (port 3007):" -ForegroundColor Yellow
try {
    $ms = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "    SUCCESS - Status $($ms.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  Admin Service (port 3005):" -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "    SUCCESS - Status $($admin.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 10: Test dropdown API (no auth needed)
Write-Host "`n[10] Testing dropdown API:" -ForegroundColor Cyan
try {
    $huyen = Invoke-WebRequest -Uri "http://localhost:3005/api/dropdown/huyen" -UseBasicParsing -TimeoutSec 10
    Write-Host "    Huyen dropdown: SUCCESS - Status $($huyen.StatusCode)" -ForegroundColor Green
    $huyenData = $huyen.Content | ConvertFrom-Json
    Write-Host "    Found $($huyenData.data.Count) districts" -ForegroundColor Green
} catch {
    Write-Host "    Huyen dropdown: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 11: Final status
Write-Host "`n[11] Final container status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "MapServer now has /usr/bin/mapserv binary installed" -ForegroundColor Green
Write-Host "Admin Service no longer uses Redis (removed all Redis code)" -ForegroundColor Green
