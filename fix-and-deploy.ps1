# Quick fix and deploy script
param(
    [switch]$SkipBuild
)

Write-Host "=== FIXING ISSUES AND DEPLOYING ===" -ForegroundColor Green

# Stop containers
Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

if (-not $SkipBuild) {
    # Remove old images to force rebuild
    Write-Host "Removing old images..." -ForegroundColor Yellow
    docker-compose build --no-cache
}

# Start only databases first
Write-Host "Starting databases..." -ForegroundColor Yellow
docker-compose up -d postgres postgis admin-postgis mongodb redis

# Wait for databases
Write-Host "Waiting for databases..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Start all services
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose up -d

# Show status
Write-Host "Checking status..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
docker-compose ps

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Frontend: http://103.56.161.239:5173" -ForegroundColor Cyan
Write-Host "API: http://103.56.161.239:3000" -ForegroundColor Cyan
