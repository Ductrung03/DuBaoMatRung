# ===== IMPORT ADMIN DATABASE =====

Write-Host "=== IMPORTING ADMIN DATABASE ===" -ForegroundColor Cyan

# Wait for admin-postgis to be ready
Write-Host "`n[1] Waiting for admin-postgis to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0

while ($retry -lt $maxRetries) {
    $check = docker exec dubaomatrung-admin-postgis pg_isready -U postgres 2>&1
    if ($check -like "*accepting connections*") {
        Write-Host "  Database is ready!" -ForegroundColor Green
        break
    }

    $retry++
    Write-Host "  Waiting... ($retry/$maxRetries)" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if ($retry -eq $maxRetries) {
    Write-Host "  ERROR: Database not ready after 60 seconds!" -ForegroundColor Red
    exit 1
}

# Check if tables exist
Write-Host "`n[2] Checking current tables..." -ForegroundColor Yellow
$tables = docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dt" 2>&1

if ($tables -like "*Did not find any relations*" -or $tables -like "*No relations found*") {
    Write-Host "  Database is EMPTY - need to import" -ForegroundColor Yellow

    # Copy SQL file
    Write-Host "`n[3] Copying SQL file to container..." -ForegroundColor Yellow
    docker cp ./docker-init/admin-postgis/01-admin-db.sql dubaomatrung-admin-postgis:/tmp/admin-db.sql

    # Import (may take 2-5 minutes for 2.5GB file)
    Write-Host "`n[4] Importing admin_db (this will take 2-5 minutes for 2.5GB database)..." -ForegroundColor Yellow
    Write-Host "  Please wait..." -ForegroundColor Cyan

    $startTime = Get-Date
    docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /tmp/admin-db.sql 2>&1 | Out-Null
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    Write-Host "  Import completed in $([math]::Round($duration, 1)) seconds!" -ForegroundColor Green

} else {
    Write-Host "  Database already has tables:" -ForegroundColor Green
    Write-Host $tables
}

# Verify tables
Write-Host "`n[5] Verifying imported tables:" -ForegroundColor Cyan
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# Check specific tables needed for dropdowns
Write-Host "`n[6] Checking required tables for dropdown APIs:" -ForegroundColor Cyan

$requiredTables = @("mv_huyen", "mv_churung", "chuc_nang_rung", "nguyen_nhan", "trang_thai_xac_minh")

foreach ($table in $requiredTables) {
    $count = docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM $table;" 2>&1

    if ($count -match "^\s*(\d+)") {
        Write-Host "  $table : $($matches[1]) rows" -ForegroundColor Green
    } else {
        Write-Host "  $table : NOT FOUND!" -ForegroundColor Red
    }
}

# Restart admin-service
Write-Host "`n[7] Restarting admin-service..." -ForegroundColor Yellow
docker-compose restart admin-service
Start-Sleep -Seconds 15

# Test dropdown API
Write-Host "`n[8] Testing dropdown API:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3005/api/dropdown/huyen" -UseBasicParsing -TimeoutSec 20
    $data = $response.Content | ConvertFrom-Json
    Write-Host "  SUCCESS! Found $($data.data.Count) districts" -ForegroundColor Green
    Write-Host "  Sample: $($data.data[0].label)" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
