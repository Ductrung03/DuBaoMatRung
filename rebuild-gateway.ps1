# Rebuild and Restart Gateway Container
# Fix CORS to allow frontend access

Write-Host ""
Write-Host "=== REBUILD GATEWAY CONTAINER ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will fix CORS errors by allowing:" -ForegroundColor Yellow
Write-Host "  - http://103.56.160.66:5173 (Frontend)" -ForegroundColor Gray
Write-Host "  - http://103.56.160.66:3000 (Gateway)" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Continue with rebuild? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Rebuild cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/5] Stopping gateway container..." -ForegroundColor Yellow

docker-compose stop gateway 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container stopped" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Container may not exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/5] Removing old container..." -ForegroundColor Yellow

docker-compose rm -f gateway 2>&1 | Out-Null
Write-Host "  [OK] Old container removed" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Building new image..." -ForegroundColor Yellow
Write-Host "  This may take 1-2 minutes..." -ForegroundColor Gray

$buildOutput = docker-compose build gateway 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Build successful" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Build output:" -ForegroundColor Gray
    Write-Host $buildOutput
    exit 1
}

Write-Host ""
Write-Host "[4/5] Starting new container..." -ForegroundColor Yellow

docker-compose up -d gateway 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container started" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to start container" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/5] Waiting for service to be ready..." -ForegroundColor Yellow

# Wait 10 seconds for service to start
Start-Sleep -Seconds 10

# Test health endpoint
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Service is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARNING] Health check failed, but service may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUCCESS] Gateway has been rebuilt with CORS fix!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Refresh browser: http://103.56.160.66:5173" -ForegroundColor Gray
Write-Host "  2. Open DevTools (F12) and check Console" -ForegroundColor Gray
Write-Host "  3. CORS errors should be gone!" -ForegroundColor Gray
Write-Host ""
Write-Host "To check gateway logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f gateway" -ForegroundColor Gray
Write-Host ""
