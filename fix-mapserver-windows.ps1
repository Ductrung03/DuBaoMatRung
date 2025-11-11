# Fix MapServer issues on Windows Docker deployment
# This script diagnoses and fixes MapServer not displaying data

Write-Host ""
Write-Host "=== FIX MAPSERVER ON WINDOWS ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Check if containers are running
Write-Host "[1/7] Checking container status..." -ForegroundColor Yellow
$containers = @("dubaomatrung-mapserver", "dubaomatrung-admin-postgis", "dubaomatrung-gateway")

foreach ($container in $containers) {
    $status = docker ps --filter "name=$container" --format "{{.Status}}" 2>&1
    if ($status -match "Up") {
        Write-Host "  [OK] $container is running" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $container is not running!" -ForegroundColor Red
        Write-Host "  Starting container..." -ForegroundColor Yellow
        docker start $container
    }
}

Write-Host ""
Write-Host "[2/7] Checking network connectivity..." -ForegroundColor Yellow
# Test if MapServer can reach PostGIS
$netTest = docker exec dubaomatrung-mapserver sh -c "ping -c 2 admin-postgis" 2>&1
if ($netTest -match "bytes from" -or $netTest -match "received") {
    Write-Host "  [OK] MapServer can reach admin-postgis" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Network connectivity issue!" -ForegroundColor Red
    Write-Host "  Check if containers are on the same network" -ForegroundColor Yellow
}

# Test PostgreSQL port
$portTest = docker exec dubaomatrung-mapserver sh -c "nc -zv admin-postgis 5432" 2>&1
if ($portTest -match "succeeded" -or $portTest -match "open") {
    Write-Host "  [OK] PostgreSQL port 5432 is accessible" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Cannot reach PostgreSQL port!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/7] Verifying database tables..." -ForegroundColor Yellow
$tables = @("laocai_ranhgioihc", "laocai_rg3lr", "laocai_huyen", "laocai_nendiahinh", "laocai_nendiahinh_line")

$allTablesOk = $true
foreach ($table in $tables) {
    $count = docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

    if ($count -match '^\d+$' -and [int]$count -gt 0) {
        Write-Host "  [OK] $table : $count rows" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $table : Missing or empty!" -ForegroundColor Red
        $allTablesOk = $false
    }
}

if (-not $allTablesOk) {
    Write-Host ""
    Write-Host "  [CRITICAL] Some tables are missing!" -ForegroundColor Red
    Write-Host "  You need to import admin_db data first." -ForegroundColor Yellow
    Write-Host "  Run: .\import-admin-db.ps1" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "[4/7] Testing PostgreSQL connection from MapServer..." -ForegroundColor Yellow
# Test if MapServer can connect to PostgreSQL
$pgTest = docker exec dubaomatrung-mapserver sh -c "apk add --no-cache postgresql-client 2>&1 > /dev/null; PGPASSWORD=4 psql -h admin-postgis -U postgres -d admin_db -c 'SELECT version();'" 2>&1

if ($pgTest -match "PostgreSQL") {
    Write-Host "  [OK] MapServer can connect to PostgreSQL!" -ForegroundColor Green
    $pgVersion = ($pgTest -match "PostgreSQL \d+") | Out-Null; $Matches[0]
    Write-Host "  Database: $pgVersion" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Cannot connect to PostgreSQL!" -ForegroundColor Red
    Write-Host "  Error: $pgTest" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[5/7] Checking mapfile configuration..." -ForegroundColor Yellow
# Check if mapfile exists and is valid
$mapfileCheck = docker exec dubaomatrung-mapserver test -f /mapserver/mapfiles/laocai.map 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Mapfile exists in container" -ForegroundColor Green

    # Check for SRID typo (should be 4326, not 4236)
    $sridCheck = docker exec dubaomatrung-mapserver grep -n "SRID=4236" /mapserver/mapfiles/laocai.map 2>&1
    if ($sridCheck) {
        Write-Host "  [ERROR] Found SRID typo (4236 instead of 4326)!" -ForegroundColor Red
        Write-Host "  Line: $sridCheck" -ForegroundColor Gray
        Write-Host "  This needs to be fixed in the source file!" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] No SRID typos found" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] Mapfile not found in container!" -ForegroundColor Red
    Write-Host "  Check volume mount: ./mapserver:/mapserver:ro" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/7] Testing WMS endpoints..." -ForegroundColor Yellow

# Test MapServer health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3007/health" -Method Get -ErrorAction Stop
    Write-Host "  [OK] MapServer service is responding" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] MapServer service not responding!" -ForegroundColor Red
}

# Test WMS GetCapabilities
try {
    $wms = "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wms -UseBasicParsing -ErrorAction Stop

    if ($response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] WMS GetCapabilities working" -ForegroundColor Green

        # Check if layers are present
        $layerCount = ([regex]::Matches($response.Content, "<Layer[^>]*queryable")).Count
        Write-Host "  Found $layerCount queryable layers" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] WMS response may be invalid" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] WMS GetCapabilities failed!" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

# Test WMS GetMap (render a layer)
try {
    $getMap = "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=huyen&CRS=EPSG:4326&BBOX=103.5,21.8,104.5,23.0&WIDTH=400&HEIGHT=400&FORMAT=image/png"
    $response = Invoke-WebRequest -Uri $getMap -UseBasicParsing -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Headers.'Content-Type' -match "image") {
        Write-Host "  [OK] WMS GetMap rendering successfully" -ForegroundColor Green
        $size = [math]::Round($response.RawContentLength / 1KB, 2)
        Write-Host "  Image size: $size KB" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] GetMap response may not be a valid image" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] WMS GetMap failed!" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[7/7] Checking Gateway proxy configuration..." -ForegroundColor Yellow

# Test through gateway
try {
    $gatewayWms = "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $gatewayWms -UseBasicParsing -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Gateway is proxying MapServer requests" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Gateway proxy may not be working correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Gateway proxy failed!" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

# Check MapServer logs for errors
Write-Host "Recent MapServer logs:" -ForegroundColor Yellow
docker logs dubaomatrung-mapserver --tail 20 2>&1 | Select-String -Pattern "error|ERROR|failed|FAILED" | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RECOMMENDED ACTIONS ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "If MapServer still not showing data:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verify SRID typo is fixed:" -ForegroundColor White
Write-Host "   Edit: mapserver/mapfiles/laocai.map" -ForegroundColor Gray
Write-Host "   Change: SRID=4236 -> SRID=4326 (line 290)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Rebuild MapServer container:" -ForegroundColor White
Write-Host "   docker-compose stop mapserver-service" -ForegroundColor Gray
Write-Host "   docker-compose rm -f mapserver-service" -ForegroundColor Gray
Write-Host "   docker-compose up -d mapserver-service" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check frontend console for errors:" -ForegroundColor White
Write-Host "   Open browser DevTools (F12)" -ForegroundColor Gray
Write-Host "   Look for CORS or network errors" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify frontend is using correct MapServer URL:" -ForegroundColor White
Write-Host "   Should be: http://103.56.160.66:3000/api/mapserver" -ForegroundColor Gray
Write-Host ""

Write-Host "Run this script again after making changes to verify fixes." -ForegroundColor Cyan
Write-Host ""
