# ===== TEST SERVICES NOW =====

Write-Host "=== TESTING SERVICES ===" -ForegroundColor Cyan

# Wait more
Write-Host "`n[1] Waiting 15 more seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test with longer timeout
Write-Host "`n[2] Testing MapServer:" -ForegroundColor Cyan
try {
    $ms = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 30
    Write-Host "  Health: OK ($($ms.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($ms.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Health: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Checking logs..." -ForegroundColor Yellow
    docker-compose logs mapserver-service --tail=10
}

Write-Host "`n[3] Testing Admin:" -ForegroundColor Cyan
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 30
    Write-Host "  Health: OK ($($admin.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($admin.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Health: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Checking logs..." -ForegroundColor Yellow
    docker-compose logs admin-service --tail=10
}

Write-Host "`n[4] Testing Admin Dropdown API:" -ForegroundColor Cyan
try {
    $huyen = Invoke-WebRequest -Uri "http://localhost:3005/api/dropdown/huyen" -UseBasicParsing -TimeoutSec 30
    Write-Host "  Huyen API: OK ($($huyen.StatusCode))" -ForegroundColor Green
    $data = $huyen.Content | ConvertFrom-Json
    Write-Host "  Found $($data.data.Count) districts" -ForegroundColor Green
    Write-Host "  First district: $($data.data[0].label)" -ForegroundColor Green
} catch {
    Write-Host "  Huyen API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[5] Testing MapServer WMS:" -ForegroundColor Cyan
try {
    $wms = Invoke-WebRequest -Uri "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -UseBasicParsing -TimeoutSec 30
    Write-Host "  WMS GetCapabilities: OK ($($wms.StatusCode))" -ForegroundColor Green
    if ($wms.Content -like "*WMS_Capabilities*") {
        Write-Host "  MapServer is working!" -ForegroundColor Green
    }
} catch {
    Write-Host "  WMS: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[6] Container status:" -ForegroundColor Cyan
docker-compose ps | Select-String -Pattern "mapserver|admin"

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green
