# ===== FINAL VERIFICATION - ALL SERVICES =====

Write-Host "=== FINAL SYSTEM CHECK ===" -ForegroundColor Cyan
Write-Host "Checking all services one more time..." -ForegroundColor Yellow

# Wait a bit more for admin service
Write-Host "`n[1] Waiting 10 more seconds for admin-service..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test all services with longer timeout
Write-Host "`n[2] Testing all service endpoints:" -ForegroundColor Cyan

$services = @(
    @{Name="Gateway"; Port=3000; Url="http://localhost:3000/health"},
    @{Name="Auth"; Port=3001; Url="http://localhost:3001/health"},
    @{Name="User"; Port=3002; Url="http://localhost:3002/health"},
    @{Name="GIS"; Port=3003; Url="http://localhost:3003/health"},
    @{Name="Report"; Port=3004; Url="http://localhost:3004/health"},
    @{Name="Admin"; Port=3005; Url="http://localhost:3005/health"},
    @{Name="Search"; Port=3006; Url="http://localhost:3006/health"},
    @{Name="MapServer"; Port=3007; Url="http://localhost:3007/health"}
)

$successCount = 0
$failCount = 0

foreach ($service in $services) {
    Write-Host "`n  $($service.Name) Service (port $($service.Port)):" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 10
        Write-Host "    OK - Status $($response.StatusCode)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

# Test login
Write-Host "`n[3] Testing login functionality:" -ForegroundColor Cyan
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
        -TimeoutSec 10

    Write-Host "  Login: SUCCESS!" -ForegroundColor Green
    $loginData = $response.Content | ConvertFrom-Json
    Write-Host "  Token received: $($loginData.token.Substring(0,50))..." -ForegroundColor Green
} catch {
    Write-Host "  Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Check container status
Write-Host "`n[4] Container status:" -ForegroundColor Cyan
docker-compose ps

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Services OK: $successCount/8" -ForegroundColor $(if ($successCount -eq 8) {"Green"} else {"Yellow"})
Write-Host "Services FAILED: $failCount/8" -ForegroundColor $(if ($failCount -eq 0) {"Green"} else {"Red"})

if ($successCount -eq 8) {
    Write-Host "`n=== ALL SYSTEMS OPERATIONAL ===" -ForegroundColor Green
    Write-Host "Your application is ready!" -ForegroundColor Green
    Write-Host "`nAccess points:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://103.56.161.239:5173" -ForegroundColor White
    Write-Host "  API Gateway: http://103.56.161.239:3000" -ForegroundColor White
    Write-Host "  API Docs: http://103.56.161.239:3000/api-docs" -ForegroundColor White
} else {
    Write-Host "`n=== SOME SERVICES NEED ATTENTION ===" -ForegroundColor Yellow
    Write-Host "Check logs for failed services:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs <service-name> --tail=30" -ForegroundColor Cyan
}
