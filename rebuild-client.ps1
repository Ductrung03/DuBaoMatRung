# Rebuild and Restart Client Container
# This applies the MapServer URL fix

Write-Host ""
Write-Host "=== REBUILD CLIENT CONTAINER ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Stop current client container" -ForegroundColor Gray
Write-Host "  2. Rebuild with new code changes" -ForegroundColor Gray
Write-Host "  3. Start the new container" -ForegroundColor Gray
Write-Host ""

$continue = Read-Host "Continue with rebuild? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Rebuild cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/5] Stopping current client container..." -ForegroundColor Yellow

docker-compose stop client 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container stopped" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Container may not exist yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/5] Removing old container..." -ForegroundColor Yellow

docker-compose rm -f client 2>&1 | Out-Null
Write-Host "  [OK] Old container removed" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Building new image..." -ForegroundColor Yellow
Write-Host "  This may take 2-5 minutes..." -ForegroundColor Gray

$buildOutput = docker-compose build client 2>&1

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

docker-compose up -d client 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Container started" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to start container" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[5/5] Waiting for service to be ready..." -ForegroundColor Yellow

# Wait 10 seconds for nginx to start
Start-Sleep -Seconds 10

Write-Host "  [OK] Service should be ready" -ForegroundColor Green

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUCCESS] Client has been rebuilt and restarted!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open browser: http://103.56.160.66:5173" -ForegroundColor Gray
Write-Host "  2. Check map layers are displaying" -ForegroundColor Gray
Write-Host "  3. Open browser console (F12) to check for errors" -ForegroundColor Gray
Write-Host ""
Write-Host "To check logs:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f client" -ForegroundColor Gray
Write-Host ""
