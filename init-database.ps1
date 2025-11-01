# ===================================================================
# DATABASE INITIALIZATION SCRIPT
# Du Bao Mat Rung System
# ===================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  DATABASE INITIALIZATION" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Running Prisma migrations ===" -ForegroundColor Yellow

# Wait for databases to be ready
Write-Host "  Waiting for databases..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Run migrations in auth-service container
Write-Host "  Running auth-service migrations..." -ForegroundColor Cyan
docker-compose exec -T auth-service npx prisma migrate deploy

Write-Host "  Running database seed..." -ForegroundColor Cyan
docker-compose exec -T auth-service node prisma/seed.js

Write-Host ""
Write-Host "=== DATABASE INITIALIZED SUCCESSFULLY ===" -ForegroundColor Green
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
