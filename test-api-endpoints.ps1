# Test API Endpoints for Dropdowns

Write-Host ""
Write-Host "=== TESTING API ENDPOINTS ===" -ForegroundColor Cyan
Write-Host ""

# Get a fresh token (assuming admin login)
Write-Host "Getting authentication token..." -NoNewline
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body (@{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop

    $token = $loginResponse.token
    Write-Host " [OK]" -ForegroundColor Green
} catch {
    Write-Host " [FAILED] Failed to login" -ForegroundColor Red
    Write-Host "Using test without token..." -ForegroundColor Yellow
    $token = $null
}

Write-Host ""

# Test endpoints
$endpoints = @(
    @{url="http://localhost:3000/api/dropdown/huyen"; name="Huyen (Districts)"},
    @{url="http://localhost:3000/api/dropdown/xa"; name="Xa (Communes)"},
    @{url="http://localhost:3000/api/dropdown/churung"; name="Chu Rung (Forest Owners)"},
    @{url="http://localhost:3000/api/dropdown/loairung"; name="Loai Rung (Forest Types)"}
)

$success = 0
$failed = 0

foreach ($endpoint in $endpoints) {
    $url = $endpoint.url
    $name = $endpoint.name

    Write-Host "Testing $name..." -NoNewline
    Write-Host ""
    Write-Host "  URL: $url" -ForegroundColor Gray

    try {
        $headers = @{}
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }

        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -TimeoutSec 10 -ErrorAction Stop

        if ($response.success) {
            $count = 0
            if ($response.data) {
                $count = $response.data.Count
            }

            Write-Host "  Status: " -NoNewline
            Write-Host "[OK] SUCCESS" -ForegroundColor Green
            Write-Host "  Items: $count" -ForegroundColor Cyan

            if ($count -gt 0) {
                Write-Host "  Sample: $($response.data[0].label)" -ForegroundColor Gray
            } else {
                Write-Host "  Warning: No data returned" -ForegroundColor Yellow
            }

            $success++
        } else {
            Write-Host "  Status: " -NoNewline
            Write-Host "[FAILED]" -ForegroundColor Red
            Write-Host "  Message: $($response.message)" -ForegroundColor Gray
            $failed++
        }
    } catch {
        Write-Host "  Status: " -NoNewline
        Write-Host "[ERROR]" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        $failed++
    }

    Write-Host ""
}

Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Success: $success" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "[SUCCESS] All endpoints are working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your web application should now work correctly." -ForegroundColor Cyan
    Write-Host "Visit: http://103.56.160.66:5173" -ForegroundColor Cyan
} else {
    Write-Host "[WARNING] Some endpoints are still failing." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: .\check-views-status.ps1" -ForegroundColor Gray
    Write-Host "2. Check if materialized views have data" -ForegroundColor Gray
    Write-Host "3. If views are empty, check source tables" -ForegroundColor Gray
}

Write-Host ""
