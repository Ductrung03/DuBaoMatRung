# Test MapServer WMS endpoints
# Verify that MapServer can connect to PostGIS and serve map data

Write-Host ""
Write-Host "=== TEST MAPSERVER WMS ENDPOINTS ===" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:3000"
$MAPSERVER_DIRECT = "http://localhost:3007"

# Test 1: Health check
Write-Host "[1/5] Testing MapServer health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$MAPSERVER_DIRECT/health" -Method Get -ErrorAction Stop
    Write-Host "  [OK] Service is running" -ForegroundColor Green
    Write-Host "  Mapfile: $($health.mapfile)" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Service is not responding!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "[2/5] Testing WMS GetCapabilities (via Gateway)..." -ForegroundColor Yellow
try {
    $wms = "$BASE_URL/api/mapserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wms -Method Get -UseBasicParsing -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] WMS GetCapabilities working" -ForegroundColor Green

        # Count layers
        $layerMatches = [regex]::Matches($response.Content, "<Layer[^>]*>")
        Write-Host "  Found $($layerMatches.Count) layers" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] Response received but may not be valid WMS" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] WMS GetCapabilities failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3/5] Testing WMS GetCapabilities (Direct)..." -ForegroundColor Yellow
try {
    $wmsDirect = "$MAPSERVER_DIRECT/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $wmsDirect -Method Get -UseBasicParsing -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] Direct WMS access working" -ForegroundColor Green

        # Check for specific layers
        $layers = @("ranhgioihc", "rg3lr", "huyen", "nendiahinh")
        foreach ($layer in $layers) {
            if ($response.Content -match $layer) {
                Write-Host "    - Layer '$layer' found" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  [WARNING] Response received but may not be valid WMS" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Direct WMS access failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/5] Testing WMS GetMap request..." -ForegroundColor Yellow
try {
    $getMap = "$MAPSERVER_DIRECT/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=huyen&STYLES=&CRS=EPSG:4326&BBOX=103.5,21.8,104.5,23.0&WIDTH=400&HEIGHT=400&FORMAT=image/png"

    $response = Invoke-WebRequest -Uri $getMap -Method Get -UseBasicParsing -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Headers.'Content-Type' -match "image") {
        Write-Host "  [OK] GetMap request successful" -ForegroundColor Green
        Write-Host "  Content-Type: $($response.Headers.'Content-Type')" -ForegroundColor Gray
        Write-Host "  Image size: $([math]::Round($response.RawContentLength / 1KB, 2)) KB" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] Response may not be a valid image" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] GetMap request failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[5/5] Checking database connection..." -ForegroundColor Yellow
try {
    $DB_CONTAINER = "dubaomatrung-admin-postgis"

    # Test connection from MapServer container to PostGIS
    $testConn = docker exec dubaomatrung-mapserver sh -c "nc -zv admin-postgis 5432" 2>&1

    if ($LASTEXITCODE -eq 0 -or $testConn -match "succeeded") {
        Write-Host "  [OK] MapServer can reach PostGIS container" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Network connectivity issue detected" -ForegroundColor Yellow
    }

    # Check if tables exist
    Write-Host ""
    Write-Host "  Checking tables in admin_db:" -ForegroundColor Gray
    $tables = @("laocai_ranhgioihc", "laocai_rg3lr", "laocai_huyen")

    foreach ($table in $tables) {
        $count = docker exec $DB_CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

        if ($count -match '^\d+$' -and [int]$count -gt 0) {
            Write-Host "    - $table : $count rows" -ForegroundColor Green
        } else {
            Write-Host "    - $table : ERROR or empty" -ForegroundColor Red
        }
    }

} catch {
    Write-Host "  [ERROR] Database check failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed, your MapServer should be displaying data on the map." -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Yellow
Write-Host "  - WMS (via Gateway): $BASE_URL/api/mapserver/wms" -ForegroundColor Gray
Write-Host "  - WMS (Direct): $MAPSERVER_DIRECT/wms" -ForegroundColor Gray
Write-Host "  - Frontend: http://103.56.161.239:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "If frontend still not showing data, check browser console for errors." -ForegroundColor Yellow
Write-Host ""
