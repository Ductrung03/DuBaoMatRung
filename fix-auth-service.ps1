# ===== SCRIPT CHECK AND FIX AUTH SERVICE =====

Write-Host "Step 1: Check container status..." -ForegroundColor Cyan
docker-compose ps

Write-Host "`nStep 2: Check auth-service logs (last 20 lines)..." -ForegroundColor Cyan
docker-compose logs auth-service --tail=20

Write-Host "`nStep 3: Check gateway logs (last 20 lines)..." -ForegroundColor Cyan
docker-compose logs gateway --tail=20

Write-Host "`nStep 4: Check postgres logs..." -ForegroundColor Cyan
docker-compose logs postgres --tail=20

Write-Host "`nStep 5: Test direct connection to auth-service..." -ForegroundColor Cyan
docker exec dubaomatrung-auth node -e "require('http').get('http://localhost:3001/health', (r) => { let data = ''; r.on('data', chunk => data += chunk); r.on('end', () => console.log(data)); });"

Write-Host "`nStep 6: Restart auth-service and gateway..." -ForegroundColor Cyan
docker-compose restart auth-service gateway

Write-Host "`nWait 10 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`nStep 7: Check status again..." -ForegroundColor Cyan
docker-compose ps

Write-Host "`nStep 8: Test API login from host..." -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing

    Write-Host "SUCCESS! Login works!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "FAILED! Login error!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"

    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "- If still error 503, run: docker-compose logs auth-service --tail=50" -ForegroundColor Yellow
Write-Host "- May need to wait for database import (5-10 minutes)" -ForegroundColor Yellow
Write-Host "- Check .env in container: docker exec dubaomatrung-auth cat .env" -ForegroundColor Yellow
