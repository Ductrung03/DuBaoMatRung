# ===================================================================
# Fix Database Port Configuration
# Auth Service đang connect sai port
# ===================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX DATABASE PORT CONFIGURATION" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Problem detected:" -ForegroundColor Yellow
Write-Host "  Auth Service trying to connect to localhost:5433 (gis_db port)" -ForegroundColor Red
Write-Host "  Should connect to localhost:5432 (auth_db port)" -ForegroundColor Green
Write-Host ""

# Check current .env
Write-Host "[1/3] Checking .env configuration..." -ForegroundColor Cyan

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw

    Write-Host "  Current database ports in .env:" -ForegroundColor Yellow
    $envContent | Select-String -Pattern "PORT.*=" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor White
    }
} else {
    Write-Host "  [X] .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Fixing .env configuration..." -ForegroundColor Cyan

# Read .env
$envLines = Get-Content ".env"
$fixed = $false

# Fix lines
$newEnv = @()
foreach ($line in $envLines) {
    # Ensure correct ports are set
    if ($line -match "^POSTGRES_PORT=") {
        $newEnv += "POSTGRES_PORT=5432"
        $fixed = $true
        Write-Host "  [OK] Set POSTGRES_PORT=5432" -ForegroundColor Green
    }
    elseif ($line -match "^POSTGIS_PORT=") {
        $newEnv += "POSTGIS_PORT=5433"
        $fixed = $true
        Write-Host "  [OK] Set POSTGIS_PORT=5433" -ForegroundColor Green
    }
    elseif ($line -match "^ADMIN_POSTGIS_PORT=") {
        $newEnv += "ADMIN_POSTGIS_PORT=5434"
        $fixed = $true
        Write-Host "  [OK] Set ADMIN_POSTGIS_PORT=5434" -ForegroundColor Green
    }
    else {
        $newEnv += $line
    }
}

# Add missing port definitions if not exist
if ($envContent -notmatch "POSTGRES_PORT=") {
    $newEnv += "POSTGRES_PORT=5432"
    Write-Host "  [OK] Added POSTGRES_PORT=5432" -ForegroundColor Green
    $fixed = $true
}
if ($envContent -notmatch "POSTGIS_PORT=") {
    $newEnv += "POSTGIS_PORT=5433"
    Write-Host "  [OK] Added POSTGIS_PORT=5433" -ForegroundColor Green
    $fixed = $true
}
if ($envContent -notmatch "ADMIN_POSTGIS_PORT=") {
    $newEnv += "ADMIN_POSTGIS_PORT=5434"
    Write-Host "  [OK] Added ADMIN_POSTGIS_PORT=5434" -ForegroundColor Green
    $fixed = $true
}

# Save .env
$newEnv | Out-File ".env" -Encoding UTF8

Write-Host ""
Write-Host "[3/3] Restarting affected services..." -ForegroundColor Cyan

# Restart all services that connect to databases
Write-Host "  Restarting auth-service, user-service, gis-service, admin-service..." -ForegroundColor Yellow

docker-compose restart auth-service user-service gis-service admin-service report-service search-service

Write-Host ""
Write-Host "  Waiting 30 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "CONFIGURATION FIXED!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Testing services..." -ForegroundColor Cyan
Write-Host ""

# Test services
$services = @(
    @{Name="Auth Service"; Port=3001},
    @{Name="User Service"; Port=3002},
    @{Name="GIS Service"; Port=3003},
    @{Name="Admin Service"; Port=3005}
)

foreach ($svc in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($svc.Port)/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  [OK] $($svc.Name) - Responding" -ForegroundColor Green
    } catch {
        Write-Host "  [X] $($svc.Name) - Still not responding" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "If services still not responding:" -ForegroundColor Yellow
Write-Host "  1. Check logs: .\deploy.ps1 -Logs -Service auth-service" -ForegroundColor White
Write-Host "  2. Check docker-compose.yml has correct DB_HOST and DB_PORT" -ForegroundColor White
Write-Host "  3. Rebuild: .\deploy.ps1 -Rebuild" -ForegroundColor White
Write-Host ""