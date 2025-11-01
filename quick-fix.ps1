# Quick fix script
Write-Host "=== QUICK FIX ===" -ForegroundColor Green

# Create .env if missing
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
DB_PASSWORD=postgres123
JWT_SECRET=dubaomatrung_jwt_secret_key_2024_very_long_and_secure_string_here
FRONTEND_URL=http://103.56.161.239:5173
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✓ .env created" -ForegroundColor Green
}

# Restart services
Write-Host "Restarting services..." -ForegroundColor Yellow
docker-compose restart auth-service admin-service gateway user-service

# Wait and check
Start-Sleep -Seconds 15
Write-Host "`n=== STATUS ===" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n=== TEST LOGIN ===" -ForegroundColor Yellow
Write-Host "Try login at: http://103.56.161.239:5173" -ForegroundColor Cyan
