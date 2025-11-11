# Check All Tables in admin_db
# Find all tables and their row counts

$CONTAINER = "dubaomatrung-admin-postgis"

Write-Host ""
Write-Host "=== ALL TABLES IN admin_db ===" -ForegroundColor Cyan
Write-Host ""

# Get list of all tables
$tables = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1

if ($LASTEXITCODE -eq 0) {
    $tableList = $tables -split "`n" | Where-Object { $_ -ne "" }

    Write-Host "Found $($tableList.Count) tables" -ForegroundColor Cyan
    Write-Host ""

    foreach ($table in $tableList) {
        $table = $table.Trim()
        if ($table -ne "") {
            Write-Host "$table..." -NoNewline

            $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

            if ($LASTEXITCODE -eq 0) {
                $count = $count.Trim()
                if ($count -match '^\d+$') {
                    if ([int]$count -gt 0) {
                        Write-Host " $count rows" -ForegroundColor Green
                    } else {
                        Write-Host " 0 rows" -ForegroundColor Gray
                    }
                } else {
                    Write-Host " ?" -ForegroundColor Gray
                }
            } else {
                Write-Host " ERROR" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "ERROR: Could not get table list" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TABLES WITH DATA (> 0 rows) ===" -ForegroundColor Cyan
Write-Host ""

# Show only tables with data
$tables = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1

if ($LASTEXITCODE -eq 0) {
    $tableList = $tables -split "`n" | Where-Object { $_ -ne "" }

    foreach ($table in $tableList) {
        $table = $table.Trim()
        if ($table -ne "") {
            $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

            if ($LASTEXITCODE -eq 0) {
                $count = $count.Trim()
                if ($count -match '^\d+$' -and [int]$count -gt 0) {
                    Write-Host "  $table : $count rows" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host ""
