# ===== FIX ALL SERVICES - FINAL =====

Write-Host "=== COMPREHENSIVE SYSTEM FIX ===" -ForegroundColor Cyan

# Step 1: Check all container status
Write-Host "`n[1] Current container status:" -ForegroundColor Yellow
docker-compose ps

# Step 2: Check gateway specifically
Write-Host "`n[2] Checking gateway logs:" -ForegroundColor Yellow
docker-compose logs gateway --tail=30

# Step 3: Check auth-service
Write-Host "`n[3] Checking auth-service logs:" -ForegroundColor Yellow
docker-compose logs auth-service --tail=30

# Step 4: Restart all services
Write-Host "`n[4] Restarting ALL services..." -ForegroundColor Yellow
docker-compose restart

# Step 5: Wait for startup
Write-Host "`n[5] Waiting 30 seconds for all services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 6: Fix materialized views (populate them)
Write-Host "`n[6] Refreshing materialized views..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
-- Check what columns exist in laocai_rg3lr
SELECT column_name FROM information_schema.columns
WHERE table_name = 'laocai_rg3lr'
ORDER BY ordinal_position;
"

Write-Host "`n[7] Refreshing mv_huyen and mv_churung..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
REFRESH MATERIALIZED VIEW mv_huyen;
REFRESH MATERIALIZED VIEW mv_churung;
"

# Step 7: Test all critical services
Write-Host "`n[8] Testing services:" -ForegroundColor Cyan

$services = @(
    @{Name="Gateway"; Url="http://localhost:3000/health"},
    @{Name="Auth"; Url="http://localhost:3001/health"},
    @{Name="User"; Url="http://localhost:3002/health"},
    @{Name="GIS"; Url="http://localhost:3003/health"},
    @{Name="Report"; Url="http://localhost:3004/health"},
    @{Name="Admin"; Url="http://localhost:3005/health"},
    @{Name="Search"; Url="http://localhost:3006/health"},
    @{Name="MapServer"; Url="http://localhost:3007/health"}
)

foreach ($svc in $services) {
    try {
        $response = Invoke-WebRequest -Uri $svc.Url -UseBasicParsing -TimeoutSec 15
        Write-Host "  $($svc.Name): OK ($($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  $($svc.Name): FAILED" -ForegroundColor Red
    }
}

# Step 8: Test login
Write-Host "`n[9] Testing login:" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing `
        -TimeoutSec 15

    Write-Host "  Login: SUCCESS!" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    $token = $data.token
    Write-Host "  Token: $($token.Substring(0,30))..." -ForegroundColor Green
} catch {
    Write-Host "  Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $token = $null
}

# Step 9: Test admin dropdown with token
if ($token) {
    Write-Host "`n[10] Testing admin dropdown API:" -ForegroundColor Cyan
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
        }
        $huyen = Invoke-WebRequest -Uri "http://localhost:3000/api/dropdown/huyen" `
            -Headers $headers `
            -UseBasicParsing `
            -TimeoutSec 15
        $data = $huyen.Content | ConvertFrom-Json
        Write-Host "  Huyen API: SUCCESS! Found $($data.data.Count) districts" -ForegroundColor Green
    } catch {
        Write-Host "  Huyen API: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 10: Final status
Write-Host "`n[11] Final container status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "Check results above. If gateway still fails, run: docker-compose logs gateway" -ForegroundColor Cyan
