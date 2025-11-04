# ===== CREATE MATERIALIZED VIEWS =====

Write-Host "=== CREATING MATERIALIZED VIEWS ===" -ForegroundColor Cyan

# Create materialized views directly
Write-Host "`n[1] Creating mv_huyen..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_huyen AS
SELECT DISTINCT huyen
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen <> ''
ORDER BY huyen;
"

Write-Host "`n[2] Creating mv_churung..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_churung AS
SELECT DISTINCT churung
FROM laocai_rg3lr
WHERE churung IS NOT NULL AND churung <> ''
ORDER BY churung;
"

Write-Host "`n[3] Creating mv_xa_by_huyen..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_xa_by_huyen AS
SELECT DISTINCT huyen, xa
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen <> ''
  AND xa IS NOT NULL AND xa <> ''
ORDER BY huyen, xa;
"

Write-Host "`n[4] Creating mv_tieukhu_by_xa..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tieukhu_by_xa AS
SELECT DISTINCT huyen, xa, tieukhu
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen <> ''
  AND xa IS NOT NULL AND xa <> ''
  AND tieukhu IS NOT NULL AND tieukhu <> ''
ORDER BY huyen, xa, tieukhu;
"

Write-Host "`n[5] Creating mv_khoanh_by_tieukhu..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_khoanh_by_tieukhu AS
SELECT DISTINCT huyen, xa, tieukhu, khoanh
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen <> ''
  AND xa IS NOT NULL AND xa <> ''
  AND tieukhu IS NOT NULL AND tieukhu <> ''
  AND khoanh IS NOT NULL AND khoanh <> ''
ORDER BY huyen, xa, tieukhu, khoanh;
"

# Create indexes for performance
Write-Host "`n[6] Creating indexes..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
CREATE UNIQUE INDEX IF NOT EXISTS mv_huyen_huyen_idx ON mv_huyen(huyen);
CREATE UNIQUE INDEX IF NOT EXISTS mv_churung_churung_idx ON mv_churung(churung);
"

# Verify
Write-Host "`n[7] Verifying materialized views:" -ForegroundColor Cyan
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dm"

# Check data
Write-Host "`n[8] Checking data in materialized views:" -ForegroundColor Cyan
Write-Host "  mv_huyen:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) as count FROM mv_huyen;"
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT * FROM mv_huyen LIMIT 5;"

Write-Host "`n  mv_churung:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) as count FROM mv_churung;"
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT * FROM mv_churung LIMIT 5;"

# Restart admin-service
Write-Host "`n[9] Restarting admin-service..." -ForegroundColor Yellow
docker-compose restart admin-service
Start-Sleep -Seconds 10

# Test API
Write-Host "`n[10] Testing dropdown APIs:" -ForegroundColor Cyan

Write-Host "  /api/dropdown/huyen:" -ForegroundColor Yellow
try {
    $huyen = Invoke-WebRequest -Uri "http://localhost:3005/api/dropdown/huyen" -UseBasicParsing -TimeoutSec 15
    $data = $huyen.Content | ConvertFrom-Json
    Write-Host "    SUCCESS! Found $($data.data.Count) districts" -ForegroundColor Green
    Write-Host "    Sample: $($data.data[0].label)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n  /api/dropdown/churung:" -ForegroundColor Yellow
try {
    $churung = Invoke-WebRequest -Uri "http://localhost:3005/api/dropdown/churung" -UseBasicParsing -TimeoutSec 15
    $data = $churung.Content | ConvertFrom-Json
    Write-Host "    SUCCESS! Found $($data.data.Count) forest owners" -ForegroundColor Green
} catch {
    Write-Host "    FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
Write-Host "All materialized views created and dropdown APIs working!" -ForegroundColor Cyan
