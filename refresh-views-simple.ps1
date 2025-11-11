# Simple Script to Refresh Materialized Views
# Run this if views already exist but need to be refreshed

$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host "Refreshing materialized views..." -ForegroundColor Yellow
Write-Host ""

# Refresh all materialized views
$commands = @(
    "REFRESH MATERIALIZED VIEW mv_huyen;",
    "REFRESH MATERIALIZED VIEW mv_xa;",
    "REFRESH MATERIALIZED VIEW mv_churung;",
    "REFRESH MATERIALIZED VIEW mv_loairung;"
)

foreach ($cmd in $commands) {
    $viewName = ($cmd -replace "REFRESH MATERIALIZED VIEW ", "" -replace ";", "")
    Write-Host "Refreshing $viewName..." -NoNewline

    docker exec $CONTAINER psql -U postgres -d admin_db -c $cmd 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓" -ForegroundColor Green
    } else {
        Write-Host " ✗" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! Test at: http://103.56.160.66:5173" -ForegroundColor Cyan
