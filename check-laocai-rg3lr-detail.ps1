# Detailed Check for laocai_rg3lr Table

$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host ""
Write-Host "=== DETAILED CHECK: laocai_rg3lr ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Direct count
Write-Host "[1] Direct COUNT(*)..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_rg3lr;"

Write-Host ""
Write-Host "[2] Count with different methods..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT COUNT(*) as total_rows, COUNT(churung) as rows_with_churung FROM laocai_rg3lr;"

Write-Host ""
Write-Host "[3] Sample rows..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT gid, churung, ldlr FROM laocai_rg3lr LIMIT 5;"

Write-Host ""
Write-Host "[4] Distinct churung values..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT DISTINCT churung FROM laocai_rg3lr WHERE churung IS NOT NULL ORDER BY churung LIMIT 10;"

Write-Host ""
Write-Host "[5] Check mv_churung view..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM mv_churung;"

Write-Host ""
Write-Host "[6] Check mv_churung view definition..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT pg_get_viewdef('mv_churung'::regclass, true);"

Write-Host ""
Write-Host "[7] Try to refresh mv_churung again..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "REFRESH MATERIALIZED VIEW mv_churung;"

Write-Host ""
Write-Host "[8] Check mv_churung after refresh..." -ForegroundColor Yellow
docker exec $CONTAINER psql -U postgres -d admin_db -c "SELECT * FROM mv_churung LIMIT 10;"

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Cyan
Write-Host ""

$count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM mv_churung;"
$countRaw = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM laocai_rg3lr;"

Write-Host "laocai_rg3lr rows: $countRaw" -ForegroundColor Cyan
Write-Host "mv_churung rows: $count" -ForegroundColor Cyan

if ($count -match '^\d+$' -and [int]$count -gt 0) {
    Write-Host ""
    Write-Host "[SUCCESS] mv_churung now has data!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARNING] mv_churung is still empty" -ForegroundColor Yellow
    Write-Host "The view might be querying the wrong column or table." -ForegroundColor Gray
}

Write-Host ""
