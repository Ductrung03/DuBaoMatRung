# ===================================================================
# Check Services Health Script
# Kiểm tra trạng thái tất cả services và khắc phục lỗi
# ===================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "CHECKING SERVICES HEALTH" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker containers
Write-Host "[1/5] Checking Docker containers..." -ForegroundColor Cyan
Write-Host ""

$containers = docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
Write-Host $containers
Write-Host ""

# Check for unhealthy containers
$unhealthy = docker-compose ps --filter "health=unhealthy" --format "{{.Name}}"
$starting = docker-compose ps --filter "health=starting" --format "{{.Name}}"
$exited = docker-compose ps --filter "status=exited" --format "{{.Name}}"

if ($unhealthy) {
    Write-Host "  [!] Unhealthy containers:" -ForegroundColor Red
    $unhealthy | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}

if ($starting) {
    Write-Host "  [~] Starting containers:" -ForegroundColor Yellow
    $starting | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
}

if ($exited) {
    Write-Host "  [X] Exited containers:" -ForegroundColor Red
    $exited | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Run: .\deploy.ps1 -Logs to see error details" -ForegroundColor Yellow
}

# Check databases
Write-Host ""
Write-Host "[2/5] Checking databases..." -ForegroundColor Cyan
Write-Host ""

# PostgreSQL
try {
    $pgTest = docker exec dubaomatrung-postgres pg_isready -U postgres 2>&1
    if ($pgTest -like "*accepting connections*") {
        Write-Host "  [OK] PostgreSQL (auth_db) - OK" -ForegroundColor Green
    } else {
        Write-Host "  [X] PostgreSQL (auth_db) - NOT READY" -ForegroundColor Red
    }
} catch {
    Write-Host "  [X] PostgreSQL (auth_db) - ERROR" -ForegroundColor Red
}

# PostGIS (gis_db)
try {
    $pgisTest = docker exec dubaomatrung-postgis pg_isready -U postgres 2>&1
    if ($pgisTest -like "*accepting connections*") {
        Write-Host "  [OK] PostGIS (gis_db) - OK" -ForegroundColor Green
    } else {
        Write-Host "  [X] PostGIS (gis_db) - NOT READY" -ForegroundColor Red
    }
} catch {
    Write-Host "  [X] PostGIS (gis_db) - ERROR" -ForegroundColor Red
}

# PostGIS (admin_db)
try {
    $adminTest = docker exec dubaomatrung-admin-postgis pg_isready -U postgres 2>&1
    if ($adminTest -like "*accepting connections*") {
        Write-Host "  [OK] PostGIS (admin_db) - OK" -ForegroundColor Green
    } else {
        Write-Host "  [X] PostGIS (admin_db) - NOT READY" -ForegroundColor Red
    }
} catch {
    Write-Host "  [X] PostGIS (admin_db) - ERROR" -ForegroundColor Red
}

# MongoDB
try {
    $mongoTest = docker exec dubaomatrung-mongodb mongosh --eval "db.adminCommand('ping')" 2>&1
    if ($mongoTest -like "*ok*1*") {
        Write-Host "  [OK] MongoDB - OK" -ForegroundColor Green
    } else {
        Write-Host "  [X] MongoDB - NOT READY" -ForegroundColor Red
    }
} catch {
    Write-Host "  [X] MongoDB - ERROR" -ForegroundColor Red
}

# Redis
try {
    $redisTest = docker exec dubaomatrung-redis redis-cli ping 2>&1
    if ($redisTest -like "*PONG*") {
        Write-Host "  [OK] Redis - OK" -ForegroundColor Green
    } else {
        Write-Host "  [X] Redis - NOT READY" -ForegroundColor Red
    }
} catch {
    Write-Host "  [X] Redis - ERROR" -ForegroundColor Red
}

# Check services endpoints
Write-Host ""
Write-Host "[3/5] Checking services endpoints..." -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{Name="Gateway"; Port=3000; Path="/health"},
    @{Name="Auth Service"; Port=3001; Path="/health"},
    @{Name="User Service"; Port=3002; Path="/"},
    @{Name="GIS Service"; Port=3003; Path="/"},
    @{Name="Report Service"; Port=3004; Path="/"},
    @{Name="Admin Service"; Port=3005; Path="/"},
    @{Name="Search Service"; Port=3006; Path="/"},
    @{Name="MapServer"; Port=3007; Path="/"},
    @{Name="Frontend"; Port=5173; Path="/"}
)

$failedServices = @()

foreach ($service in $services) {
    $url = "http://localhost:$($service.Port)$($service.Path)"
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $($service.Name) (port $($service.Port)) - OK" -ForegroundColor Green
        } else {
            Write-Host "  [!] $($service.Name) (port $($service.Port)) - HTTP $($response.StatusCode)" -ForegroundColor Yellow
            $failedServices += $service.Name
        }
    } catch {
        Write-Host "  [X] $($service.Name) (port $($service.Port)) - NOT RESPONDING" -ForegroundColor Red
        $failedServices += $service.Name
    }
    Start-Sleep -Milliseconds 100
}

# Check logs for errors
Write-Host ""
Write-Host "[4/5] Checking recent errors..." -ForegroundColor Cyan
Write-Host ""

$errorContainers = @("dubaomatrung-gateway", "dubaomatrung-auth")

foreach ($container in $errorContainers) {
    $logs = docker logs $container --tail 10 2>&1 | Select-String -Pattern "error|ERROR|Error|fail|FAIL|exception|Exception"
    if ($logs) {
        Write-Host "  [!] Errors in ${container}:" -ForegroundColor Yellow
        $logs | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    }
}

# Summary and recommendations
Write-Host ""
Write-Host "[5/5] Summary and recommendations..." -ForegroundColor Cyan
Write-Host ""

if ($failedServices.Count -eq 0) {
    Write-Host "  [OK] All services are healthy!" -ForegroundColor Green
} else {
    Write-Host "  [!] Failed services:" -ForegroundColor Red
    $failedServices | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Recommended actions:" -ForegroundColor Yellow
    Write-Host "    1. Wait 30-60 seconds for services to fully start" -ForegroundColor White
    Write-Host "    2. Check logs: .\deploy.ps1 -Logs" -ForegroundColor White
    Write-Host "    3. Restart failed services: docker-compose restart SERVICE_NAME" -ForegroundColor White
    Write-Host "    4. If persists, rebuild: .\deploy.ps1 -Rebuild" -ForegroundColor White
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Detailed logs commands:" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  .\deploy.ps1 -Logs -Service gateway" -ForegroundColor White
Write-Host "  .\deploy.ps1 -Logs -Service auth-service" -ForegroundColor White
Write-Host "  .\deploy.ps1 -Logs -Service gis-service" -ForegroundColor White
Write-Host ""

# Auto-fix suggestions
if ($failedServices -contains "Gateway" -or $failedServices -contains "Auth Service") {
    Write-Host ""
    Write-Host "Quick fix for Gateway/Auth issues:" -ForegroundColor Yellow
    Write-Host "  docker-compose restart gateway auth-service" -ForegroundColor Cyan
    Write-Host ""

    $autoFix = Read-Host "Do you want to restart these services now? (y/n)"
    if ($autoFix -eq "y") {
        Write-Host ""
        Write-Host "Restarting gateway and auth-service..." -ForegroundColor Cyan
        docker-compose restart gateway auth-service

        Write-Host ""
        Write-Host "Waiting 15 seconds for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15

        Write-Host ""
        Write-Host "Testing again..." -ForegroundColor Cyan

        # Test gateway
        try {
            $gwTest = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            Write-Host "  [OK] Gateway is now responding" -ForegroundColor Green
        } catch {
            Write-Host "  [X] Gateway still not responding" -ForegroundColor Red
        }

        # Test auth
        try {
            $authTest = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            Write-Host "  [OK] Auth Service is now responding" -ForegroundColor Green
        } catch {
            Write-Host "  [X] Auth Service still not responding" -ForegroundColor Red
        }
    }
}

Write-Host ""