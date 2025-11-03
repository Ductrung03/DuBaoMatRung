# ===== CHECK AND IMPORT DATABASES =====

Write-Host "=== CHECKING DATABASE STATUS ===" -ForegroundColor Cyan

# Check admin_db tables
Write-Host "`n[1] Checking admin_db tables:" -ForegroundColor Yellow
$adminCheck = docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dt" 2>&1

if ($adminCheck -like "*Did not find any relations*" -or $adminCheck -like "*No relations found*") {
    Write-Host "  admin_db is EMPTY! Need to import" -ForegroundColor Red
    $needAdminImport = $true
} else {
    Write-Host "  admin_db has tables:" -ForegroundColor Green
    Write-Host $adminCheck
    $needAdminImport = $false
}

# Check gis_db tables
Write-Host "`n[2] Checking gis_db tables:" -ForegroundColor Yellow
$gisCheck = docker exec dubaomatrung-postgis psql -U postgres -d gis_db -c "\dt" 2>&1

if ($gisCheck -like "*Did not find any relations*" -or $gisCheck -like "*No relations found*") {
    Write-Host "  gis_db is EMPTY! Need to import" -ForegroundColor Red
    $needGisImport = $true
} else {
    Write-Host "  gis_db has tables:" -ForegroundColor Green
    Write-Host $gisCheck
    $needGisImport = $false
}

# Import if needed
if ($needAdminImport) {
    Write-Host "`n[3] Importing admin_db schema (this may take 2-5 minutes for 2.5GB database)..." -ForegroundColor Yellow

    # Copy SQL file to container
    docker cp ./docker-init/admin-postgis/01-admin-db.sql dubaomatrung-admin-postgis:/tmp/admin-db.sql

    # Import
    Write-Host "  Executing SQL import..." -ForegroundColor Yellow
    docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /tmp/admin-db.sql

    Write-Host "  admin_db import complete!" -ForegroundColor Green
}

if ($needGisImport) {
    Write-Host "`n[4] Importing gis_db schema..." -ForegroundColor Yellow

    # Copy SQL file to container
    docker cp ./docker-init/postgis/01-gis-db.sql dubaomatrung-postgis:/tmp/gis-db.sql

    # Import
    Write-Host "  Executing SQL import..." -ForegroundColor Yellow
    docker exec dubaomatrung-postgis psql -U postgres -d gis_db -f /tmp/gis-db.sql

    Write-Host "  gis_db import complete!" -ForegroundColor Green
}

# Verify
Write-Host "`n[5] Verifying tables:" -ForegroundColor Cyan

Write-Host "  admin_db tables:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 10;"

Write-Host "`n  gis_db tables:" -ForegroundColor Yellow
docker exec dubaomatrung-postgis psql -U postgres -d gis_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 10;"

# Restart admin service to clear any cached errors
if ($needAdminImport) {
    Write-Host "`n[6] Restarting admin-service..." -ForegroundColor Yellow
    docker-compose restart admin-service
    Start-Sleep -Seconds 10
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
Write-Host "Now test the dropdown API again!" -ForegroundColor Cyan
