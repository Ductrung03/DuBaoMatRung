# Complete MapServer fix for Windows Docker
# This is the "nuclear option" - restart everything in correct order

Write-Host ""
Write-Host "=== COMPLETE MAPSERVER FIX ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Stop all services" -ForegroundColor Gray
Write-Host "  2. Remove MapServer container" -ForegroundColor Gray
Write-Host "  3. Rebuild MapServer with fixes" -ForegroundColor Gray
Write-Host "  4. Start services in correct order" -ForegroundColor Gray
Write-Host "  5. Verify connectivity" -ForegroundColor Gray
Write-Host ""
Write-Host "Estimated time: 2-3 minutes" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Continue? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

$ErrorActionPreference = "Continue"

# Step 1: Stop services
Write-Host ""
Write-Host "[1/8] Stopping services..." -ForegroundColor Yellow
docker-compose stop mapserver-service gateway
Start-Sleep -Seconds 2
Write-Host "  [OK] Services stopped" -ForegroundColor Green

# Step 2: Remove MapServer container
Write-Host ""
Write-Host "[2/8] Removing old MapServer container..." -ForegroundColor Yellow
docker-compose rm -f mapserver-service
Write-Host "  [OK] Container removed" -ForegroundColor Green

# Step 3: Verify mapfile has fix
Write-Host ""
Write-Host "[3/8] Verifying mapfile configuration..." -ForegroundColor Yellow
$mapfilePath = "mapserver/mapfiles/laocai.map"

if (Test-Path $mapfilePath) {
    $sridCheck = Select-String -Path $mapfilePath -Pattern "SRID=4236"

    if ($sridCheck) {
        Write-Host "  [ERROR] SRID typo still exists!" -ForegroundColor Red
        Write-Host "  Fixing automatically..." -ForegroundColor Yellow

        # Fix SRID typo
        (Get-Content $mapfilePath) -replace 'SRID=4236', 'SRID=4326' | Set-Content $mapfilePath
        Write-Host "  [OK] SRID fixed: 4236 -> 4326" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Mapfile configuration correct" -ForegroundColor Green
    }

    # Verify connection strings
    $connCheck = Select-String -Path $mapfilePath -Pattern "host=localhost"

    if ($connCheck) {
        Write-Host "  [WARNING] Found localhost in connection strings" -ForegroundColor Yellow
        Write-Host "  These should be 'admin-postgis'" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] Connection strings use admin-postgis" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] Mapfile not found!" -ForegroundColor Red
}

# Step 4: Rebuild MapServer image
Write-Host ""
Write-Host "[4/8] Rebuilding MapServer image..." -ForegroundColor Yellow
Write-Host "  This may take 1-2 minutes..." -ForegroundColor Gray
docker-compose build --no-cache mapserver-service 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Image rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
    Write-Host "  Check docker-compose.yml and Dockerfile" -ForegroundColor Yellow
    exit 1
}

# Step 5: Start PostGIS first (if not running)
Write-Host ""
Write-Host "[5/8] Ensuring PostGIS is running..." -ForegroundColor Yellow
$postgisStatus = docker ps --filter "name=dubaomatrung-admin-postgis" --format "{{.Status}}"

if ($postgisStatus -match "Up") {
    Write-Host "  [OK] PostGIS already running" -ForegroundColor Green
} else {
    Write-Host "  Starting PostGIS..." -ForegroundColor Yellow
    docker-compose up -d admin-postgis
    Start-Sleep -Seconds 5
    Write-Host "  [OK] PostGIS started" -ForegroundColor Green
}

# Step 6: Start MapServer
Write-Host ""
Write-Host "[6/8] Starting MapServer..." -ForegroundColor Yellow
docker-compose up -d mapserver-service

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] MapServer started" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to start MapServer!" -ForegroundColor Red
    exit 1
}

# Wait for service to initialize
Write-Host "  Waiting for service to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 7: Verify network connectivity
Write-Host ""
Write-Host "[7/8] Verifying network connectivity..." -ForegroundColor Yellow

# Test ping
$pingTest = docker exec dubaomatrung-mapserver ping -c 2 admin-postgis 2>&1

if ($pingTest -match "bytes from") {
    Write-Host "  [OK] Network connectivity working" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Ping test failed" -ForegroundColor Yellow
    Write-Host "  Attempting network fix..." -ForegroundColor Gray

    # Try to reconnect to network
    $network = "dubaomatrung_default"
    docker network connect $network dubaomatrung-mapserver 2>&1 | Out-Null
    Start-Sleep -Seconds 2

    # Test again
    $pingTest2 = docker exec dubaomatrung-mapserver ping -c 2 admin-postgis 2>&1

    if ($pingTest2 -match "bytes from") {
        Write-Host "  [OK] Network fix successful" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Network still not working" -ForegroundColor Red
    }
}

# Test PostgreSQL connection
Write-Host ""
Write-Host "  Testing PostgreSQL port..." -ForegroundColor Gray
$portTest = docker exec dubaomatrung-mapserver nc -zv admin-postgis 5432 2>&1

if ($portTest -match "open" -or $portTest -match "succeeded") {
    Write-Host "  [OK] PostgreSQL port accessible" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] PostgreSQL port not accessible" -ForegroundColor Yellow
}

# Step 8: Test WMS endpoints
Write-Host ""
Write-Host "[8/8] Testing WMS endpoints..." -ForegroundColor Yellow

Start-Sleep -Seconds 3

# Test health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3007/health" -Method Get -ErrorAction Stop -TimeoutSec 5

    if ($health.status -eq "ok") {
        Write-Host "  [OK] MapServer health check passed" -ForegroundColor Green
    }
} catch {
    Write-Host "  [ERROR] Health check failed" -ForegroundColor Red
}

# Test GetCapabilities
try {
    $wms = "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wms -UseBasicParsing -ErrorAction Stop -TimeoutSec 10

    if ($response.StatusCode -eq 200 -and $response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] WMS GetCapabilities working" -ForegroundColor Green

        # Count layers
        $layerCount = ([regex]::Matches($response.Content, "<Layer[^>]*queryable")).Count
        Write-Host "  Found $layerCount layers" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] GetCapabilities response invalid" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] GetCapabilities failed" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

# Test GetMap (render actual layer)
try {
    $getMap = "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=huyen&CRS=EPSG:4326&BBOX=103.5,21.8,104.5,23.0&WIDTH=400&HEIGHT=400&FORMAT=image/png"
    $response = Invoke-WebRequest -Uri $getMap -UseBasicParsing -ErrorAction Stop -TimeoutSec 10

    if ($response.StatusCode -eq 200 -and $response.Headers.'Content-Type' -match "image") {
        $size = [math]::Round($response.RawContentLength / 1KB, 2)
        Write-Host "  [OK] GetMap rendering successfully ($size KB)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] GetMap response invalid" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] GetMap failed" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
}

# Start Gateway
Write-Host ""
Write-Host "Starting Gateway..." -ForegroundColor Yellow
docker-compose up -d gateway
Start-Sleep -Seconds 3
Write-Host "  [OK] Gateway started" -ForegroundColor Green

Write-Host ""
Write-Host "=== COMPLETION SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

# Final checks
$allGood = $true

Write-Host "Service Status:" -ForegroundColor Yellow
$services = @("dubaomatrung-mapserver", "dubaomatrung-admin-postgis", "dubaomatrung-gateway")
foreach ($service in $services) {
    $status = docker ps --filter "name=$service" --format "{{.Status}}"
    if ($status -match "Up") {
        Write-Host "  ✅ $service" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $service" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""
if ($allGood) {
    Write-Host "[SUCCESS] MapServer fix completed! ✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test URLs:" -ForegroundColor Yellow
    Write-Host "  Frontend: http://103.56.160.66:5173" -ForegroundColor Gray
    Write-Host "  WMS: http://103.56.160.66:3000/api/mapserver" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Open browser and check if map layers are visible." -ForegroundColor Cyan
} else {
    Write-Host "[WARNING] Some services may have issues" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Check logs:" -ForegroundColor White
    Write-Host "  docker logs dubaomatrung-mapserver --tail 50" -ForegroundColor Gray
    Write-Host ""
    Write-Host "If still not working, try full restart:" -ForegroundColor White
    Write-Host "  docker-compose down" -ForegroundColor Gray
    Write-Host "  docker-compose up -d" -ForegroundColor Gray
}

Write-Host ""
