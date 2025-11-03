# ===== FIX REDIS CONNECTION ISSUE =====

Write-Host "=== FIXING REDIS CONNECTION FOR ADMIN & SEARCH SERVICES ===" -ForegroundColor Cyan

# Step 1: Stop services
Write-Host "`n[1] Stopping admin-service and search-service..." -ForegroundColor Yellow
docker-compose stop admin-service search-service

# Step 2: Remove containers
Write-Host "`n[2] Removing old containers..." -ForegroundColor Yellow
docker-compose rm -f admin-service search-service

# Step 3: Rebuild services
Write-Host "`n[3] Rebuilding services (this may take 1-2 minutes)..." -ForegroundColor Yellow
docker-compose up -d --build admin-service search-service

# Step 4: Wait for startup
Write-Host "`n[4] Waiting 20 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Step 5: Check status
Write-Host "`n[5] Checking container status:" -ForegroundColor Cyan
docker-compose ps | Select-String -Pattern "admin|search"

# Step 6: Check logs
Write-Host "`n[6] Checking admin-service logs:" -ForegroundColor Cyan
docker-compose logs admin-service --tail=15

Write-Host "`n[7] Checking search-service logs:" -ForegroundColor Cyan
docker-compose logs search-service --tail=15

# Step 7: Test health endpoints
Write-Host "`n[8] Testing services:" -ForegroundColor Cyan

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

# Step 8: Final status
Write-Host "`n[9] Final status of all services:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "All services should be running now!" -ForegroundColor Green
Write-Host "`nIf any service still has issues, check logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs <service-name> --tail=50" -ForegroundColor Cyan
