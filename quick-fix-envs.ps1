# ===================================================================
# Quick Fix - Remove Service .env Files (No Rebuild Required)
# ===================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "QUICK FIX - REMOVE SERVICE .ENV FILES" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Remove .env files from all services" -ForegroundColor White
Write-Host "  2. Restart services (docker-compose.yml env vars will be used)" -ForegroundColor White
Write-Host "  3. Test if services are working" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/3] Removing service .env files..." -ForegroundColor Cyan

$services = @(
    "auth-service",
    "user-service",
    "gis-service",
    "admin-service",
    "report-service",
    "search-service",
    "mapserver-service"
)

foreach ($service in $services) {
    $envPath = "microservices\services\$service\.env"

    if (Test-Path $envPath) {
        # Backup first
        $backupPath = "microservices\services\$service\.env.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $envPath $backupPath -Force

        # Remove
        Remove-Item $envPath -Force
        Write-Host "  [OK] Removed $service\.env (backed up)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[2/3] Restarting services..." -ForegroundColor Cyan

docker-compose restart

Write-Host ""
Write-Host "  Waiting 45 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

Write-Host ""
Write-Host "[3/3] Testing services..." -ForegroundColor Cyan
Write-Host ""

# Test services
$tests = @(
    @{Name="Gateway"; Port=3000; Path="/health"},
    @{Name="Auth"; Port=3001; Path="/health"},
    @{Name="User"; Port=3002; Path="/"},
    @{Name="GIS"; Port=3003; Path="/"},
    @{Name="Report"; Port=3004; Path="/"},
    @{Name="Admin"; Port=3005; Path="/"},
    @{Name="Frontend"; Port=5173; Path="/"}
)

$failed = 0
$success = 0

foreach ($test in $tests) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($test.Port)$($test.Path)" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  [OK] $($test.Name) (port $($test.Port))" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  [X] $($test.Name) (port $($test.Port))" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Result: $success OK, $failed Failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "SUCCESS! All services are working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your app:" -ForegroundColor Cyan
    Write-Host "  http://localhost:5173" -ForegroundColor White
    Write-Host "  http://103.56.160.66:5173" -ForegroundColor White
} else {
    Write-Host "Some services failed. Checking logs..." -ForegroundColor Yellow
    Write-Host ""

    # Check auth service logs for errors
    Write-Host "Auth Service recent logs:" -ForegroundColor Yellow
    docker logs dubaomatrung-auth --tail 5

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check detailed logs: .\deploy.ps1 -Logs -Service auth-service" -ForegroundColor White
    Write-Host "  2. Run full health check: .\check-services-health.ps1" -ForegroundColor White
    Write-Host "  3. If still failing, rebuild: docker-compose build && docker-compose up -d" -ForegroundColor White
}

Write-Host ""