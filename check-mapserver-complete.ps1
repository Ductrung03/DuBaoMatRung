# ===== CHECK MAPSERVER COMPLETE =====

Write-Host "=== CHECKING MAPSERVER CONFIGURATION ===" -ForegroundColor Cyan

# Check MapServer logs
Write-Host "`n[1] MapServer logs (last 50 lines):" -ForegroundColor Yellow
docker-compose logs mapserver-service --tail=50

# Check if mapfile exists
Write-Host "`n[2] Checking mapfile:" -ForegroundColor Yellow
docker exec dubaomatrung-mapserver ls -lh /mapserver/mapfiles/

# Check mapfile content
Write-Host "`n[3] Mapfile content (first 100 lines):" -ForegroundColor Yellow
docker exec dubaomatrung-mapserver head -100 /mapserver/mapfiles/laocai.map

# Test WMS GetCapabilities
Write-Host "`n[4] Testing WMS GetCapabilities:" -ForegroundColor Yellow
try {
    $wms = Invoke-WebRequest -Uri "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -UseBasicParsing -TimeoutSec 10
    Write-Host "  GetCapabilities: OK ($($wms.StatusCode))" -ForegroundColor Green

    # Check which layers are available
    if ($wms.Content -match "<Layer>") {
        Write-Host "  Layers found in WMS:" -ForegroundColor Green
        $layers = [regex]::Matches($wms.Content, "<Name>([^<]+)</Name>")
        foreach ($layer in $layers) {
            Write-Host "    - $($layer.Groups[1].Value)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  WARNING: No layers found in WMS!" -ForegroundColor Red
    }
} catch {
    Write-Host "  GetCapabilities: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test a sample WMS GetMap request
Write-Host "`n[5] Testing WMS GetMap (sample tile):" -ForegroundColor Yellow
try {
    $map = Invoke-WebRequest -Uri "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ranhgioihc&BBOX=11427641,2504688,11584184,2661231&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&FORMAT=image/png" -UseBasicParsing -TimeoutSec 10
    Write-Host "  GetMap: OK ($($map.StatusCode))" -ForegroundColor Green
    Write-Host "  Image size: $($map.Content.Length) bytes" -ForegroundColor Green

    if ($map.Content.Length -lt 1000) {
        Write-Host "  WARNING: Image too small, might be blank!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  GetMap: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Check PostGIS connection
Write-Host "`n[6] Checking PostGIS data:" -ForegroundColor Yellow
Write-Host "  Tables in admin_db:" -ForegroundColor Cyan
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname='public'
  AND tablename LIKE 'laocai_%'
ORDER BY tablename;
"

Write-Host "`n  Sample data from laocai_ranhgioihc:" -ForegroundColor Cyan
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT COUNT(*) as total_features FROM laocai_ranhgioihc;
"

# Check if MapServer binary exists
Write-Host "`n[7] Checking MapServer binary:" -ForegroundColor Yellow
docker exec dubaomatrung-mapserver which mapserv
docker exec dubaomatrung-mapserver mapserv -v

# Test direct mapserv command
Write-Host "`n[8] Testing direct mapserv execution:" -ForegroundColor Yellow
docker exec dubaomatrung-mapserver sh -c "QUERY_STRING='SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities&map=/mapserver/mapfiles/laocai.map' REQUEST_METHOD=GET mapserv" | Select-String -Pattern "Layer|Name" | Select-Object -First 20

Write-Host "`n=== CHECK COMPLETE ===" -ForegroundColor Green
Write-Host "Review the output above to identify MapServer issues" -ForegroundColor Cyan
