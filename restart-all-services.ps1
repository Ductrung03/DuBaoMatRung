# ====================================================================
# RESTART ALL SERVICES - Quick Restart Without Rebuild
# ====================================================================
# Use this if services are already built with correct config
# This is much faster than full rebuild (takes ~2 minutes)
# ====================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "RESTART ALL SERVICES - Quick Restart" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Restart all services without rebuilding" -ForegroundColor Gray
Write-Host "  2. Wait for services to initialize" -ForegroundColor Gray
Write-Host "  3. Test all services" -ForegroundColor Gray
Write-Host ""
Write-Host "This will take about 2-3 minutes." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

# Restart all services
Write-Host ""
Write-Host "[1/3] Restarting all services..." -ForegroundColor Yellow
docker-compose restart
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restart services" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All services restarted" -ForegroundColor Green

# Wait for services to start
Write-Host ""
Write-Host "[2/3] Waiting 60 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Test services
Write-Host ""
Write-Host "[3/3] Testing all services..." -ForegroundColor Yellow
Write-Host ""

$services = @{
    "Gateway" = "http://localhost:3000/health"
    "Auth" = "http://localhost:3001/health"
    "User" = "http://localhost:3002/health"
    "GIS" = "http://localhost:3003/health"
    "Report" = "http://localhost:3004/health"
    "Admin" = "http://localhost:3005/health"
    "Search" = "http://localhost:3006/health"
    "MapServer" = "http://localhost:3007/health"
    "Frontend" = "http://localhost:5173"
}

$successCount = 0
$failCount = 0
$failedServices = @()

foreach ($service in $services.GetEnumerator()) {
    try {
        $response = Invoke-WebRequest -Uri $service.Value -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $($service.Key)" -ForegroundColor Green
            $successCount++
        }
    } catch {
        Write-Host "  [X] $($service.Key)" -ForegroundColor Red
        $failCount++
        $failedServices += $service.Key
    }
}

# Summary
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Result: $successCount OK, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "====================================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Failed services: $($failedServices -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If services are still failing, you may need to rebuild:" -ForegroundColor Yellow
    Write-Host "  .\fix-all-services.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "🎉 ALL SERVICES ARE RUNNING! 🎉" -ForegroundColor Green
}

Write-Host ""
