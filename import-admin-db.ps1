# Import 01-admin-db.sql into PostgreSQL
# This file is 2.5GB so it will take 10-20 minutes

$CONTAINER = "dubaomatrung-admin-postgis"
$SQL_FILE = "docker-init/admin-postgis/01-admin-db.sql"

Write-Host ""
Write-Host "=== IMPORT ADMIN DATABASE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will take 10-20 minutes!" -ForegroundColor Yellow
Write-Host "File size: 2.5 GB" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Continue with import? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Import cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/5] Checking if file exists..." -ForegroundColor Yellow

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "  [ERROR] SQL file not found: $SQL_FILE" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $SQL_FILE).Length / 1GB
Write-Host "  [OK] File found: $([math]::Round($fileSize, 2)) GB" -ForegroundColor Green

Write-Host ""
Write-Host "[2/5] Checking PostgreSQL container..." -ForegroundColor Yellow

$running = docker ps -q -f name=$CONTAINER
if ([string]::IsNullOrEmpty($running)) {
    Write-Host "  [ERROR] Container not running!" -ForegroundColor Red
    Write-Host "  Start it with: docker-compose up -d" -ForegroundColor Gray
    exit 1
}

Write-Host "  [OK] Container is running" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Backing up current data (if any)..." -ForegroundColor Yellow

# Quick backup of current state
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "admin_db_backup_$timestamp.sql"

Write-Host "  Creating backup: $backupFile" -ForegroundColor Gray
docker exec $CONTAINER pg_dump -U postgres admin_db > $backupFile 2>&1

if ($LASTEXITCODE -eq 0) {
    $backupSize = (Get-Item $backupFile).Length / 1KB
    if ($backupSize -gt 10) {
        Write-Host "  [OK] Backup created: $([math]::Round($backupSize, 2)) KB" -ForegroundColor Green
    } else {
        Write-Host "  [OK] No data to backup (database was empty)" -ForegroundColor Gray
        Remove-Item $backupFile -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  [SKIP] Could not create backup (database might be empty)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/5] Dropping and recreating database..." -ForegroundColor Yellow

docker exec $CONTAINER psql -U postgres -c "DROP DATABASE IF EXISTS admin_db;" 2>&1 | Out-Null
docker exec $CONTAINER psql -U postgres -c "CREATE DATABASE admin_db;" 2>&1 | Out-Null
docker exec $CONTAINER psql -U postgres -d admin_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 | Out-Null

Write-Host "  [OK] Database recreated with PostGIS" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Importing SQL file..." -ForegroundColor Yellow
Write-Host "  This will take 10-20 minutes. Please wait..." -ForegroundColor Gray
Write-Host "  Started at: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

# Copy file into container first
Write-Host "  [Step 1/2] Copying SQL file to container..." -ForegroundColor Gray
docker cp $SQL_FILE ${CONTAINER}:/tmp/import.sql 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [ERROR] Failed to copy file to container!" -ForegroundColor Red
    exit 1
}

# Import SQL file inside container (much faster and no memory issues)
Write-Host "  [Step 2/2] Importing SQL (this takes 10-20 min)..." -ForegroundColor Gray
docker exec $CONTAINER psql -U postgres -d admin_db -f /tmp/import.sql 2>&1 | Out-Null

# Clean up
docker exec $CONTAINER rm /tmp/import.sql 2>&1 | Out-Null

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMinutes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  [OK] Import completed in $([math]::Round($duration, 2)) minutes" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  [ERROR] Import failed!" -ForegroundColor Red
    Write-Host "  Duration: $([math]::Round($duration, 2)) minutes" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

# Verify data
Write-Host "Checking table row counts..." -ForegroundColor Yellow

$tables = @("laocai_rg3lr", "laocai_ranhgioihc", "mat_rung")

foreach ($table in $tables) {
    Write-Host "  $table..." -NoNewline

    $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1

    if ($LASTEXITCODE -eq 0 -and $count -match '^\d+$') {
        if ([int]$count -gt 0) {
            Write-Host " $count rows" -ForegroundColor Green
        } else {
            Write-Host " 0 rows" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ERROR" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Checking materialized views..." -ForegroundColor Yellow

$views = @("mv_churung", "mv_huyen", "mv_xa_by_huyen")

foreach ($view in $views) {
    Write-Host "  $view..." -NoNewline

    $count = docker exec $CONTAINER psql -U postgres -d admin_db -t -A -c "SELECT COUNT(*) FROM $view;" 2>&1

    if ($LASTEXITCODE -eq 0 -and $count -match '^\d+$') {
        if ([int]$count -gt 0) {
            Write-Host " $count rows" -ForegroundColor Green
        } else {
            Write-Host " 0 rows (needs refresh)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ERROR" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUCCESS] Database import completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\fix-views-windows.ps1" -ForegroundColor Gray
Write-Host "  2. Run: .\test-api-endpoints.ps1" -ForegroundColor Gray
Write-Host "  3. Test web application: http://103.56.160.66:5173" -ForegroundColor Gray
Write-Host ""
