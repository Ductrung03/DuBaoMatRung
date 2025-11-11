# Fix Materialized Views - Populate Data
# Run this on Windows Server to fix the dropdown errors

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "FIX MATERIALIZED VIEWS - Populate Data for Dropdowns" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Get admin PostGIS container
$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host "[1/3] Checking if container is running..." -ForegroundColor Yellow
$running = docker ps --filter "name=$CONTAINER" --format "{{.Names}}"
if (-not $running) {
    Write-Host "  [ERROR] Container $CONTAINER is not running!" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Container is running" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Refreshing materialized views..." -ForegroundColor Yellow

# List of materialized views to refresh
$views = @(
    "mv_huyen",
    "mv_xa",
    "mv_churung",
    "mv_loairung"
)

$success = 0
$failed = 0

foreach ($view in $views) {
    Write-Host "  Refreshing $view..." -NoNewline

    $result = docker exec $CONTAINER psql -U postgres -d admin_db -c "REFRESH MATERIALIZED VIEW $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
        $success++
    } else {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host "    Error: $result" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "[3/3] Verifying data..." -ForegroundColor Yellow

foreach ($view in $views) {
    Write-Host "  Checking $view..." -NoNewline

    $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $count = $count.Trim()
        if ([int]$count -gt 0) {
            Write-Host " [OK] ($count rows)" -ForegroundColor Green
        } else {
            Write-Host " [WARNING] (0 rows - view is empty)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " [ERROR]" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Summary: $success succeeded, $failed failed" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ All materialized views refreshed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test the dropdowns at: http://103.56.160.66:5173" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some views failed to refresh. Check errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If views don't exist, you may need to run the migration script:" -ForegroundColor Yellow
    Write-Host "  docker exec $CONTAINER psql -U postgres -d admin_db -f /docker-entrypoint-initdb.d/create-views.sql" -ForegroundColor Cyan
}
