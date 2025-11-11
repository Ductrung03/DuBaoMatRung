# Check for Chu Rung (Forest Owner) Data
# Search all tables for columns that might contain forest owner data

$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host ""
Write-Host "=== SEARCHING FOR CHU RUNG DATA ===" -ForegroundColor Cyan
Write-Host ""

# Check mat_rung table (from MongoDB - this might have the data)
Write-Host "[1] Checking mat_rung table (MongoDB data)..." -ForegroundColor Yellow

$query = "SELECT COUNT(*) as total, COUNT(DISTINCT chu_rung) as distinct_chu_rung FROM mat_rung WHERE chu_rung IS NOT NULL;"
$result = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c $query 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Result: $result" -ForegroundColor Cyan

    # Try to get some sample data
    $sample = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT DISTINCT chu_rung FROM mat_rung WHERE chu_rung IS NOT NULL LIMIT 5;" 2>&1

    if ($LASTEXITCODE -eq 0 -and $sample) {
        Write-Host "  Sample chu_rung values:" -ForegroundColor Green
        $sample -split "`n" | Where-Object { $_ -ne "" } | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ERROR: $result" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] Checking laocai_ranhgioihc (Administrative boundaries)..." -ForegroundColor Yellow

# Check columns in this table
$columns = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'laocai_ranhgioihc' ORDER BY ordinal_position;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Columns:" -ForegroundColor Cyan
    $columns -split "`n" | Where-Object { $_ -ne "" } | ForEach-Object {
        Write-Host "    - $_" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[3] Checking other tables with 'chu' or 'rung' in name..." -ForegroundColor Yellow

$tables = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%chu%' OR tablename LIKE '%rung%' OR tablename LIKE '%forest%') ORDER BY tablename;" 2>&1

if ($LASTEXITCODE -eq 0 -and $tables) {
    $tableList = $tables -split "`n" | Where-Object { $_ -ne "" }

    foreach ($table in $tableList) {
        $table = $table.Trim()
        if ($table -ne "") {
            $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

            if ($LASTEXITCODE -eq 0) {
                $count = $count.Trim()
                Write-Host "  $table : $count rows" -ForegroundColor Cyan
            }
        }
    }
} else {
    Write-Host "  No tables found with 'chu' or 'rung' in name" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4] Current mv_churung view definition..." -ForegroundColor Yellow

$viewDef = docker exec $CONTAINER psql -U postgres -d admin_db -c "\d+ mv_churung" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $viewDef -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== RECOMMENDATION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Based on the data found, we should:" -ForegroundColor Yellow
Write-Host "1. Check if 'mat_rung' table has chu_rung data" -ForegroundColor Gray
Write-Host "2. If yes, recreate mv_churung to query from mat_rung instead of laocai_rg3lr" -ForegroundColor Gray
Write-Host "3. If no, import the missing forest owner data" -ForegroundColor Gray
Write-Host ""
