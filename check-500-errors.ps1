# ===== CHECK 500 ERRORS =====

Write-Host "=== CHECKING 500 ERRORS ===" -ForegroundColor Cyan

# Check MapServer logs
Write-Host "`n[1] MapServer Service logs (last 50 lines):" -ForegroundColor Yellow
docker-compose logs mapserver-service --tail=50

Write-Host "`n" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Yellow

# Check Admin Service logs
Write-Host "[2] Admin Service logs (last 50 lines):" -ForegroundColor Yellow
docker-compose logs admin-service --tail=50

Write-Host "`n" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Yellow

# Check Gateway logs
Write-Host "[3] Gateway logs (last 30 lines):" -ForegroundColor Yellow
docker-compose logs gateway --tail=30

Write-Host "`n" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Yellow

# Test MapServer directly (bypass gateway)
Write-Host "[4] Testing MapServer directly (port 3007):" -ForegroundColor Yellow
try {
    $ms = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Health endpoint: OK" -ForegroundColor Green
} catch {
    Write-Host "  Health endpoint: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Admin Service directly (bypass gateway)
Write-Host "`n[5] Testing Admin Service directly (port 3005):" -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Health endpoint: OK" -ForegroundColor Green
} catch {
    Write-Host "  Health endpoint: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test dropdown API directly
Write-Host "`n[6] Testing Admin dropdown API directly:" -ForegroundColor Yellow
try {
    $huyen = Invoke-WebRequest -Uri "http://localhost:3005/api/huyen" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Huyen API: OK - Status $($huyen.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Huyen API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== CHECK COMPLETE ===" -ForegroundColor Cyan
Write-Host "Review the logs above to identify the root cause" -ForegroundColor Yellow
