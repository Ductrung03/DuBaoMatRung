# Quick Check - View Status
# Shows row counts for all materialized views

$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host ""
Write-Host "=== MATERIALIZED VIEWS STATUS ===" -ForegroundColor Cyan
Write-Host ""

$views = @("mv_churung", "mv_huyen", "mv_xa_by_huyen", "mv_tieukhu_by_xa", "mv_khoanh_by_tieukhu")

foreach ($view in $views) {
    Write-Host "Checking $view..." -NoNewline

    $result = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $count = $result.Trim()
        if ($count -match '^\d+$' -and [int]$count -gt 0) {
            Write-Host " ✓ $count rows" -ForegroundColor Green
        } elseif ($count -eq "0") {
            Write-Host " ✗ EMPTY (0 rows)" -ForegroundColor Yellow
        } else {
            Write-Host " ? $count" -ForegroundColor Gray
        }
    } else {
        Write-Host " ✗ ERROR" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== SOURCE TABLES STATUS ===" -ForegroundColor Cyan
Write-Host ""

$tables = @("laocai_ranhgioihc", "laocai_rg3lr")

foreach ($table in $tables) {
    Write-Host "Checking $table..." -NoNewline

    $result = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $count = $result.Trim()
        if ($count -match '^\d+$' -and [int]$count -gt 0) {
            Write-Host " ✓ $count rows" -ForegroundColor Green
        } elseif ($count -eq "0") {
            Write-Host " ✗ EMPTY (0 rows)" -ForegroundColor Yellow
        } else {
            Write-Host " ? $count" -ForegroundColor Gray
        }
    } else {
        Write-Host " ✗ ERROR" -ForegroundColor Red
    }
}

Write-Host ""
