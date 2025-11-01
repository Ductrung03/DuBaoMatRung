# Fix API connection
Write-Host "=== FIXING API CONNECTION ===" -ForegroundColor Green

# Check API status
Write-Host "Checking API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://103.56.161.239:3000/health" -TimeoutSec 5
    Write-Host "✓ API is running: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ API not responding" -ForegroundColor Red
    
    # Restart gateway
    Write-Host "Restarting gateway..." -ForegroundColor Yellow
    docker-compose restart gateway
    
    # Wait and check again
    Start-Sleep -Seconds 10
    try {
        $response = Invoke-WebRequest -Uri "http://103.56.161.239:3000/health" -TimeoutSec 5
        Write-Host "✓ API now running: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Still not working. Checking logs..." -ForegroundColor Red
        docker-compose logs --tail=10 gateway
    }
}

# Check services status
Write-Host "`n=== SERVICES STATUS ===" -ForegroundColor Cyan
docker-compose ps | Where-Object { $_ -match "gateway|auth|client" }

Write-Host "`n=== QUICK TEST ===" -ForegroundColor Yellow
Write-Host "Frontend: http://103.56.161.239:5173" -ForegroundColor Cyan
Write-Host "API: http://103.56.161.239:3000" -ForegroundColor Cyan
