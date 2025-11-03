# ===== FIX DOCKER BUILD CACHE ISSUE =====

Write-Host "=== FIXING DOCKER BUILD CACHE FOR ADMIN & SEARCH SERVICES ===" -ForegroundColor Cyan

# Step 1: Prune Docker build cache
Write-Host "`n[1] Cleaning Docker build cache..." -ForegroundColor Yellow
docker builder prune -af

# Step 2: Remove old images
Write-Host "`n[2] Removing old service images..." -ForegroundColor Yellow
docker rmi -f dubaomatrung-admin-service 2>$null
docker rmi -f dubaomatrung-search-service 2>$null

# Step 3: Rebuild services WITHOUT cache
Write-Host "`n[3] Rebuilding services from scratch (no cache, may take 2-3 minutes)..." -ForegroundColor Yellow
docker-compose build --no-cache admin-service search-service

# Step 4: Start services
Write-Host "`n[4] Starting services..." -ForegroundColor Yellow
docker-compose up -d admin-service search-service

# Step 5: Wait for startup
Write-Host "`n[5] Waiting 20 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Step 6: Check status
Write-Host "`n[6] Checking container status:" -ForegroundColor Cyan
docker-compose ps | Select-String -Pattern "admin|search"

# Step 7: Check logs
Write-Host "`n[7] Checking admin-service logs:" -ForegroundColor Cyan
docker-compose logs admin-service --tail=20

Write-Host "`n[8] Checking search-service logs:" -ForegroundColor Cyan
docker-compose logs search-service --tail=20

# Step 8: Test health endpoints
Write-Host "`n[9] Testing services:" -ForegroundColor Cyan

Write-Host "  Admin Service (port 3005):" -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    SUCCESS - Status $($admin.StatusCode)" -ForegroundColor Green
    $adminContent = $admin.Content | ConvertFrom-Json
    Write-Host "    Response: $($adminContent | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  Search Service (port 3006):" -ForegroundColor Yellow
try {
    $search = Invoke-WebRequest -Uri "http://localhost:3006/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    SUCCESS - Status $($search.StatusCode)" -ForegroundColor Green
    $searchContent = $search.Content | ConvertFrom-Json
    Write-Host "    Response: $($searchContent | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Final status
Write-Host "`n[10] Final status of all services:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "Admin and Search services should be running now!" -ForegroundColor Green
