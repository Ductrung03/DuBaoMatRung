# check-server-health.ps1
# Script kiểm tra health của services trên server

param(
    [string]$ServerIP = "103.56.160.66",
    [int]$Port = 3000
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  KIỂM TRA HEALTH SERVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://${ServerIP}:${Port}"

# 1. Kiểm tra Gateway
Write-Host "[1/8] Checking Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 5
    if ($response.status -eq "OK") {
        Write-Host "  ✓ Gateway: OK (uptime: $($response.uptime)s)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Gateway: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Kiểm tra Auth Service
Write-Host "`n[2/8] Checking Auth Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/health" -TimeoutSec 10
    Write-Host "  ✓ Auth Service: OK" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Auth Service: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Kiểm tra Admin Service - Dropdown endpoints
Write-Host "`n[3/8] Checking Admin Service Dropdowns..." -ForegroundColor Yellow

$dropdowns = @("huyen", "xa", "nguyennhan", "churung", "chucnangrung")

foreach ($dropdown in $dropdowns) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/dropdown/$dropdown" -TimeoutSec 15
        if ($response.success) {
            $count = $response.data.Count
            Write-Host "  ✓ /dropdown/$dropdown : $count items" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ✗ /dropdown/$dropdown : FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 500
}

# 4. Kiểm tra GIS Service
Write-Host "`n[4/8] Checking GIS Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/mat-rung?limit=1" -TimeoutSec 15
    Write-Host "  ✓ GIS Service (mat-rung): OK" -ForegroundColor Green
} catch {
    Write-Host "  ✗ GIS Service: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Kiểm tra User endpoint (cần auth)
Write-Host "`n[5/8] Checking User endpoints..." -ForegroundColor Yellow
Write-Host "  ⚠ Skipped - Requires authentication" -ForegroundColor DarkYellow

# 6. Kiểm tra Search Service
Write-Host "`n[6/8] Checking Search Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/search?q=test&limit=1" -TimeoutSec 10
    Write-Host "  ✓ Search Service: OK" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Search Service: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Kiểm tra MapServer
Write-Host "`n[7/8] Checking MapServer..." -ForegroundColor Yellow
try {
    $wmsUrl = "$baseUrl/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wmsUrl -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ MapServer WMS: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ MapServer: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Kiểm tra Frontend
Write-Host "`n[8/8] Checking Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -TimeoutSec 5
    if ($response.StatusCode -eq 200 -and $response.Content -like "*<!DOCTYPE html>*") {
        Write-Host "  ✓ Frontend: OK (served)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Frontend: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  HEALTH CHECK COMPLETED" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Gợi ý troubleshooting
Write-Host "`n📋 Nếu có lỗi, chạy trên SERVER:" -ForegroundColor Cyan
Write-Host "  1. Kiểm tra PM2: pm2 status" -ForegroundColor White
Write-Host "  2. Xem logs: pm2 logs gateway" -ForegroundColor White
Write-Host "  3. Restart services: pm2 restart all" -ForegroundColor White
Write-Host "  4. Kiểm tra DB: " -ForegroundColor White
Write-Host '     psql -U postgres -d gis_db -c "\dt nguyen_nhan"' -ForegroundColor Gray
