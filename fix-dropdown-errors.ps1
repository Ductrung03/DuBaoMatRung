# Complete Fix for Dropdown Errors
# This script creates and populates materialized views

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "COMPLETE FIX FOR DROPDOWN ERRORS" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Check if mat_rung table has data" -ForegroundColor Yellow
Write-Host "  2. Create materialized views for dropdowns" -ForegroundColor Yellow
Write-Host "  3. Populate the views with data" -ForegroundColor Yellow
Write-Host "  4. Test the API endpoints" -ForegroundColor Yellow
Write-Host ""

$CONTAINER = "dubaomatrung-admin-postgis"

# Check if container is running
Write-Host "[1/5] Checking container status..." -ForegroundColor Yellow
$running = docker ps --filter "name=$CONTAINER" --format "{{.Names}}"
if (-not $running) {
    Write-Host "  [ERROR] Container $CONTAINER is not running!" -ForegroundColor Red
    Write-Host "  Please run: docker-compose up -d" -ForegroundColor Cyan
    exit 1
}
Write-Host "  [OK] Container is running" -ForegroundColor Green
Write-Host ""

# Check if mat_rung table has data
Write-Host "[2/5] Checking mat_rung table..." -ForegroundColor Yellow
$count = docker exec $CONTAINER psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM mat_rung;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Cannot query mat_rung table!" -ForegroundColor Red
    Write-Host "  Error: $count" -ForegroundColor Red
    exit 1
}

$count = $count.Trim()
Write-Host "  mat_rung has $count rows" -ForegroundColor Cyan

if ([int]$count -eq 0) {
    Write-Host "  [WARNING] mat_rung table is empty!" -ForegroundColor Yellow
    Write-Host "  You need to import data first before dropdowns will work." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}
Write-Host "  [OK] Table has data" -ForegroundColor Green
Write-Host ""

# Copy SQL file to container
Write-Host "[3/5] Creating materialized views..." -ForegroundColor Yellow

# Check if SQL file exists
if (-not (Test-Path "create-materialized-views.sql")) {
    Write-Host "  [ERROR] create-materialized-views.sql not found!" -ForegroundColor Red
    Write-Host "  Please make sure the file exists in current directory." -ForegroundColor Red
    exit 1
}

# Copy SQL file to container
docker cp create-materialized-views.sql ${CONTAINER}:/tmp/create-views.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to copy SQL file to container!" -ForegroundColor Red
    exit 1
}

# Execute SQL file
$result = docker exec $CONTAINER psql -U postgres -d admin_db -f /tmp/create-views.sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Materialized views created successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "  View counts:" -ForegroundColor Cyan
    $result | Select-String -Pattern "mv_" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  [ERROR] Failed to create views!" -ForegroundColor Red
    Write-Host "  Error: $result" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verify views are working
Write-Host "[4/5] Verifying materialized views..." -ForegroundColor Yellow

$views = @("mv_huyen", "mv_xa", "mv_churung", "mv_loairung")
$allOk = $true

foreach ($view in $views) {
    $viewCount = docker exec $CONTAINER psql -U postgres -d admin_db -t -c "SELECT COUNT(*) FROM $view;" 2>&1

    if ($LASTEXITCODE -eq 0) {
        $viewCount = $viewCount.Trim()
        Write-Host "  $view : $viewCount rows" -ForegroundColor Cyan

        if ([int]$viewCount -eq 0) {
            Write-Host "    [WARNING] View is empty!" -ForegroundColor Yellow
            $allOk = $false
        }
    } else {
        Write-Host "  $view : [ERROR]" -ForegroundColor Red
        $allOk = $false
    }
}

if ($allOk) {
    Write-Host "  [OK] All views verified" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Some views are empty or have errors" -ForegroundColor Yellow
}
Write-Host ""

# Test API endpoints
Write-Host "[5/5] Testing API endpoints..." -ForegroundColor Yellow
Write-Host ""

$endpoints = @(
    "http://localhost:3000/api/dropdown/huyen",
    "http://localhost:3000/api/dropdown/xa",
    "http://localhost:3000/api/dropdown/churung",
    "http://localhost:3000/api/dropdown/loairung"
)

$token = "YOUR_TOKEN_HERE"  # Replace with actual token if needed

foreach ($endpoint in $endpoints) {
    Write-Host "  Testing $endpoint..." -NoNewline

    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -Headers @{
            "Authorization" = "Bearer $token"
        } -UseBasicParsing -TimeoutSec 5 2>&1

        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            $count = $data.data.Count
            Write-Host " [OK] ($count items)" -ForegroundColor Green
        } else {
            Write-Host " [FAILED] Status: $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host " [FAILED] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "DONE!" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

if ($allOk) {
    Write-Host "✅ All materialized views are working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The dropdown errors should now be fixed." -ForegroundColor Green
    Write-Host "Visit http://103.56.160.66:5173 to test the application." -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Some issues detected. Please check the warnings above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - mat_rung table is empty -> Import data first" -ForegroundColor Gray
    Write-Host "  - Views are empty -> Check if mat_rung has valid data" -ForegroundColor Gray
}

Write-Host ""
Write-Host "To manually refresh views in the future, run:" -ForegroundColor Cyan
Write-Host "  docker exec $CONTAINER psql -U postgres -d admin_db -c 'REFRESH MATERIALIZED VIEW mv_huyen;'" -ForegroundColor Gray
