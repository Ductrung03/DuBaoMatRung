# ===================================================================
# Fix All Service .env Files
# Update DATABASE_URL in all service .env files for Docker environment
# ===================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX ALL SERVICE .ENV FILES" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Problem: Services have .env files with localhost DATABASE_URL" -ForegroundColor Yellow
Write-Host "Fix: Remove/rename .env files (Docker will use docker-compose.yml env vars)" -ForegroundColor Green
Write-Host ""

$services = @(
    "auth-service",
    "user-service",
    "gis-service",
    "admin-service",
    "report-service",
    "search-service",
    "mapserver-service"
)

Write-Host "[1/2] Backing up and removing service .env files..." -ForegroundColor Cyan
Write-Host ""

foreach ($service in $services) {
    $envPath = "microservices\services\$service\.env"

    if (Test-Path $envPath) {
        $backupPath = "microservices\services\$service\.env.local.backup"

        # Backup
        Copy-Item $envPath $backupPath -Force
        Write-Host "  [OK] Backed up: $service\.env -> .env.local.backup" -ForegroundColor Green

        # Remove (so Docker env vars take precedence)
        Remove-Item $envPath -Force
        Write-Host "  [OK] Removed: $service\.env" -ForegroundColor Yellow
    } else {
        Write-Host "  [SKIP] $service has no .env file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[2/2] Rebuilding and restarting services..." -ForegroundColor Cyan
Write-Host ""

Write-Host "  Rebuilding all services (this may take 5-10 minutes)..." -ForegroundColor Yellow
docker-compose build

Write-Host ""
Write-Host "  Restarting all services..." -ForegroundColor Yellow
docker-compose restart

Write-Host ""
Write-Host "  Waiting 60 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "FIX COMPLETED!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Testing services..." -ForegroundColor Cyan
Write-Host ""

# Test services
$testServices = @(
    @{Name="Gateway"; Port=3000},
    @{Name="Auth Service"; Port=3001},
    @{Name="User Service"; Port=3002},
    @{Name="GIS Service"; Port=3003},
    @{Name="Admin Service"; Port=3005}
)

$allOk = $true

foreach ($svc in $testServices) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($svc.Port)/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  [OK] $($svc.Name) - Responding" -ForegroundColor Green
    } catch {
        Write-Host "  [X] $($svc.Name) - Not responding" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""

if ($allOk) {
    Write-Host "SUCCESS! All services are working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Try accessing:" -ForegroundColor Cyan
    Write-Host "  http://localhost:5173" -ForegroundColor White
    Write-Host "  http://103.56.160.66:5173" -ForegroundColor White
} else {
    Write-Host "Some services still not responding" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check logs: .\deploy.ps1 -Logs" -ForegroundColor White
    Write-Host "  2. Wait another 30-60 seconds and test again" -ForegroundColor White
    Write-Host "  3. Run: .\check-services-health.ps1" -ForegroundColor White
}

Write-Host ""