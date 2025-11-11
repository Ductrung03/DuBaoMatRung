# Find Import Files for Database

Write-Host ""
Write-Host "=== SEARCHING FOR IMPORT FILES ===" -ForegroundColor Cyan
Write-Host ""

# Check for SQL dump files
Write-Host "[1] Looking for SQL dump files..." -ForegroundColor Yellow
$sqlFiles = Get-ChildItem -Path . -Filter "*.sql" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1MB }

if ($sqlFiles) {
    Write-Host "  Found SQL files:" -ForegroundColor Green
    foreach ($file in $sqlFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "    - $($file.FullName) ($sizeMB MB)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  No large SQL files found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2] Looking for shapefile data..." -ForegroundColor Yellow
$shpFiles = Get-ChildItem -Path . -Filter "*.shp" -Recurse -ErrorAction SilentlyContinue

if ($shpFiles) {
    Write-Host "  Found shapefiles:" -ForegroundColor Green
    foreach ($file in $shpFiles) {
        Write-Host "    - $($file.FullName)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  No shapefiles found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[3] Looking for backup files..." -ForegroundColor Yellow
$backupFiles = Get-ChildItem -Path . -Filter "*.backup" -Recurse -ErrorAction SilentlyContinue
$backupFiles += Get-ChildItem -Path . -Filter "*.dump" -Recurse -ErrorAction SilentlyContinue
$backupFiles += Get-ChildItem -Path . -Filter "*.bak" -Recurse -ErrorAction SilentlyContinue

if ($backupFiles) {
    Write-Host "  Found backup files:" -ForegroundColor Green
    foreach ($file in $backupFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "    - $($file.FullName) ($sizeMB MB)" -ForegroundColor Cyan
    }
} else {
    Write-Host "  No backup files found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4] Checking docker-init directory..." -ForegroundColor Yellow
if (Test-Path "docker-init/admin-postgis") {
    $initFiles = Get-ChildItem -Path "docker-init/admin-postgis" -Filter "*.sql" -ErrorAction SilentlyContinue

    if ($initFiles) {
        Write-Host "  Found init files:" -ForegroundColor Green
        foreach ($file in $initFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            Write-Host "    - $($file.Name) ($sizeMB MB)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  No SQL files in docker-init/admin-postgis" -ForegroundColor Gray
    }
} else {
    Write-Host "  docker-init/admin-postgis directory not found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[5] Checking volumes for data..." -ForegroundColor Yellow
$volumes = docker volume ls --format "{{.Name}}" | Where-Object { $_ -like "*admin*" -or $_ -like "*postgis*" }

if ($volumes) {
    Write-Host "  Found PostgreSQL volumes:" -ForegroundColor Green
    foreach ($vol in $volumes) {
        Write-Host "    - $vol" -ForegroundColor Cyan
    }
} else {
    Write-Host "  No admin/postgis volumes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== WHAT YOU NEED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To populate laocai_rg3lr table, you need ONE of these:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SQL Dump File" -ForegroundColor White
Write-Host "   - File name like: laocai_rg3lr.sql, admin_db.sql, or 01-admin-db.sql" -ForegroundColor Gray
Write-Host "   - Contains: INSERT INTO laocai_rg3lr ..." -ForegroundColor Gray
Write-Host "   - Import with: docker exec -i dubaomatrung-admin-postgis psql -U postgres -d admin_db < file.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Shapefile (.shp)" -ForegroundColor White
Write-Host "   - File name: laocai_rg3lr.shp (with .dbf, .shx, .prj files)" -ForegroundColor Gray
Write-Host "   - Contains: Forest planning data (Quy hoach rung 3 loai rung)" -ForegroundColor Gray
Write-Host "   - Import with: shp2pgsql or QGIS" -ForegroundColor Gray
Write-Host ""
Write-Host "3. PostgreSQL Backup" -ForegroundColor White
Write-Host "   - File name: admin_db.backup or admin_db.dump" -ForegroundColor Gray
Write-Host "   - Restore with: pg_restore" -ForegroundColor Gray
Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you have the data file:" -ForegroundColor Yellow
Write-Host "  1. Copy it to this directory (C:\DuBaoMatRung)" -ForegroundColor Gray
Write-Host "  2. Let me know the filename and I'll create an import script" -ForegroundColor Gray
Write-Host ""
Write-Host "If you DON'T have the data file:" -ForegroundColor Yellow
Write-Host "  1. Check your original server/backup location" -ForegroundColor Gray
Write-Host "  2. Look for files with 'rg3lr' or 'admin_db' in the name" -ForegroundColor Gray
Write-Host "  3. Or check if you have the original shapefile data" -ForegroundColor Gray
Write-Host ""
