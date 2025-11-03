# ===== CHECK REMAINING SERVICES =====

Write-Host "=== CHECKING REMAINING SERVICES ===" -ForegroundColor Cyan

# Wait a bit more for slow services
Write-Host "`n[1] Waiting 20 more seconds for admin and search services..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check container status
Write-Host "`n[2] Container status:" -ForegroundColor Yellow
docker-compose ps

# Check admin-service logs
Write-Host "`n[3] Admin Service logs:" -ForegroundColor Yellow
docker-compose logs admin-service --tail=30

# Check search-service logs
Write-Host "`n[4] Search Service logs:" -ForegroundColor Yellow
docker-compose logs search-service --tail=30

# Test services again
Write-Host "`n[5] Testing services again:" -ForegroundColor Cyan

Write-Host "  Admin Service (port 3005):" -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($admin.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Checking if container is running..." -ForegroundColor Yellow
    docker ps --filter "name=admin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

Write-Host "`n  Search Service (port 3006):" -ForegroundColor Yellow
try {
    $search = Invoke-WebRequest -Uri "http://localhost:3006/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($search.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Checking if container is running..." -ForegroundColor Yellow
    docker ps --filter "name=search" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# If still failing, try restart
Write-Host "`n[6] If services still failing, restart them:" -ForegroundColor Cyan
$restart = Read-Host "Restart admin and search services? (y/n)"

if ($restart -eq "y" -or $restart -eq "Y") {
    Write-Host "Restarting admin-service and search-service..." -ForegroundColor Yellow
    docker-compose restart admin-service search-service

    Write-Host "Waiting 15 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    Write-Host "`nTesting again:" -ForegroundColor Cyan

    try {
        $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing
        Write-Host "  Admin: OK" -ForegroundColor Green
    } catch {
        Write-Host "  Admin: FAILED" -ForegroundColor Red
    }

    try {
        $search = Invoke-WebRequest -Uri "http://localhost:3006/health" -UseBasicParsing
        Write-Host "  Search: OK" -ForegroundColor Green
    } catch {
        Write-Host "  Search: FAILED" -ForegroundColor Red
    }
}

# Final status
Write-Host "`n[7] Final container status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== CHECK COMPLETE ===" -ForegroundColor Green
Write-Host "If services still fail after restart, check:" -ForegroundColor Yellow
Write-Host "  - docker-compose logs admin-service" -ForegroundColor Cyan
Write-Host "  - docker-compose logs search-service" -ForegroundColor Cyan
