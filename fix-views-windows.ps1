# Quick Fix for Materialized Views on Windows Server
# This script refreshes the existing materialized views

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " FIXING DROPDOWN ERRORS - Refreshing Materialized Views" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$CONTAINER = "dubaomatrung-admin-postgis"

# Step 1: Check container
Write-Host "[Step 1/4] Checking PostgreSQL container..." -ForegroundColor Yellow
$running = docker ps -q -f name=$CONTAINER
if ([string]::IsNullOrEmpty($running)) {
    Write-Host "  ERROR: Container '$CONTAINER' is not running!" -ForegroundColor Red
    Write-Host "  Please start the services first: docker-compose up -d" -ForegroundColor Gray
    exit 1
}
Write-Host "  OK: Container is running" -ForegroundColor Green
Write-Host ""

# Step 2: Check source tables
Write-Host "[Step 2/4] Checking source tables..." -ForegroundColor Yellow

$tables = @(
    @{name="laocai_rg3lr"; view="mv_churung"},
    @{name="laocai_ranhgioihc"; view="mv_huyen,mv_xa_by_huyen"},
    @{name="laocai_rg3lr"; view="mv_tieukhu_by_xa,mv_khoanh_by_tieukhu"}
)

$hasData = $true
foreach ($table in $tables) {
    $tableName = $table.name
    $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM $tableName;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $count = $count.Trim()
        Write-Host "  $tableName : $count rows" -ForegroundColor Cyan

        if ([int]$count -eq 0) {
            Write-Host "    WARNING: Table is empty! Views depending on this will be empty too." -ForegroundColor Yellow
            $hasData = $false
        }
    } else {
        Write-Host "  $tableName : ERROR - $count" -ForegroundColor Red
        $hasData = $false
    }
}

if (-not $hasData) {
    Write-Host ""
    Write-Host "  WARNING: Some source tables are empty or have errors!" -ForegroundColor Yellow
    Write-Host "  The materialized views will be empty until you import data." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

Write-Host ""

# Step 3: Refresh materialized views
Write-Host "[Step 3/4] Refreshing materialized views..." -ForegroundColor Yellow

$views = @("mv_churung", "mv_huyen", "mv_xa_by_huyen", "mv_tieukhu_by_xa", "mv_khoanh_by_tieukhu")
$refreshed = 0
$failed = 0

foreach ($view in $views) {
    Write-Host "  Refreshing $view..." -NoNewline

    $result = docker exec $CONTAINER psql -U postgres -d admin_db -c "REFRESH MATERIALIZED VIEW $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $refreshed++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "    Error: $result" -ForegroundColor Gray
        $failed++
    }
}

Write-Host ""
Write-Host "  Refreshed: $refreshed/$($views.Count)" -ForegroundColor Cyan
Write-Host ""

# Step 4: Verify views have data
Write-Host "[Step 4/4] Verifying view data..." -ForegroundColor Yellow

$allGood = $true
foreach ($view in $views) {
    $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $count = $count.Trim()

        if ([int]$count -gt 0) {
            Write-Host "  $view : $count rows" -ForegroundColor Green
        } else {
            Write-Host "  $view : 0 rows (EMPTY)" -ForegroundColor Yellow
            $allGood = $false
        }
    } else {
        Write-Host "  $view : ERROR" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host " SUCCESS! All materialized views are populated." -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The dropdown errors should now be fixed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test your application at: http://103.56.160.66:5173" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host " PARTIALLY SUCCESSFUL - Some views are empty" -ForegroundColor Yellow
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Some materialized views are still empty." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This means the source tables don't have data yet." -ForegroundColor Gray
    Write-Host "You need to import your GIS data (shapefiles) into these tables:" -ForegroundColor Gray
    Write-Host "  - laocai_rg3lr (for forest data)" -ForegroundColor Gray
    Write-Host "  - laocai_ranhgioihc (for administrative boundaries)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After importing data, run this script again to refresh the views." -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "To manually refresh a single view in the future:" -ForegroundColor Cyan
Write-Host "  docker exec $CONTAINER psql -U postgres -d admin_db -c ""REFRESH MATERIALIZED VIEW mv_huyen;""" -ForegroundColor Gray
Write-Host ""
