# ===== FIX MAPSERVER FINAL =====

Write-Host "=== FIXING MAPSERVER - MOUNTING MAPFILES ===" -ForegroundColor Cyan

# Step 1: Stop and remove mapserver
Write-Host "`n[1] Stopping mapserver..." -ForegroundColor Yellow
docker-compose stop mapserver-service
docker-compose rm -f mapserver-service

# Step 2: Start with new volumes
Write-Host "`n[2] Starting mapserver with mapfiles mounted..." -ForegroundColor Yellow
docker-compose up -d mapserver-service

# Step 3: Wait
Write-Host "`n[3] Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 4: Verify mapfile is mounted
Write-Host "`n[4] Verifying mapfile is mounted in container:" -ForegroundColor Cyan
docker exec dubaomatrung-mapserver ls -lh /mapserver/mapfiles/

# Step 5: Check mapfile content
Write-Host "`n[5] Checking mapfile CONNECTION strings:" -ForegroundColor Cyan
docker exec dubaomatrung-mapserver grep -A 2 "CONNECTION" /mapserver/mapfiles/laocai.map

# Step 6: Test WMS
Write-Host "`n[6] Testing WMS GetCapabilities:" -ForegroundColor Cyan
try {
    $wms = Invoke-WebRequest -Uri "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Status: OK ($($wms.StatusCode))" -ForegroundColor Green

    # Extract layer names
    $layers = [regex]::Matches($wms.Content, "<Name>([^<]+)</Name>")
    Write-Host "  Found $($layers.Count) layers:" -ForegroundColor Green
    foreach ($layer in $layers | Select-Object -First 10) {
        Write-Host "    - $($layer.Groups[1].Value)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Test GetMap
Write-Host "`n[7] Testing WMS GetMap (ranhgioihc layer):" -ForegroundColor Cyan
try {
    $map = Invoke-WebRequest -Uri "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ranhgioihc&BBOX=11427641,2504688,11584184,2661231&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&FORMAT=image/png&TRANSPARENT=true" -UseBasicParsing -TimeoutSec 10
    Write-Host "  Status: OK ($($map.StatusCode))" -ForegroundColor Green
    Write-Host "  Image size: $($map.Content.Length) bytes" -ForegroundColor Green

    if ($map.Content.Length -lt 1000) {
        Write-Host "  WARNING: Image is very small ($($map.Content.Length) bytes) - might be blank or error" -ForegroundColor Yellow
        Write-Host "  This usually means:" -ForegroundColor Yellow
        Write-Host "    1. No data in the BBOX requested" -ForegroundColor Yellow
        Write-Host "    2. CONNECTION string in mapfile is wrong" -ForegroundColor Yellow
        Write-Host "    3. Table is empty or geometry is NULL" -ForegroundColor Yellow
    } else {
        Write-Host "  Image looks good! Data is being rendered." -ForegroundColor Green
    }
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Check PostGIS data
Write-Host "`n[8] Checking PostGIS data:" -ForegroundColor Cyan
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT
    'laocai_ranhgioihc' as table_name,
    COUNT(*) as total_rows,
    COUNT(geom) as rows_with_geometry,
    ST_SRID(geom) as srid
FROM laocai_ranhgioihc
GROUP BY ST_SRID(geom)
LIMIT 1;
"

Write-Host "`n=== MAPSERVER FIX COMPLETE ===" -ForegroundColor Green
Write-Host "If images are still blank, the issue is likely:" -ForegroundColor Yellow
Write-Host "  1. Table 'laocai_ranhgioihc' has 0 rows (need to import data)" -ForegroundColor Yellow
Write-Host "  2. Mapfile CONNECTION points to wrong host/database" -ForegroundColor Yellow
Write-Host "  3. Geometry column is NULL or wrong SRID" -ForegroundColor Yellow
