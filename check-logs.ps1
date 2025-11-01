# Debug script to check logs
Write-Host "=== CHECKING LOGS ===" -ForegroundColor Yellow

Write-Host "`n--- AUTH SERVICE LOGS ---" -ForegroundColor Cyan
docker-compose logs --tail=20 auth-service

Write-Host "`n--- GATEWAY LOGS ---" -ForegroundColor Cyan  
docker-compose logs --tail=20 gateway

Write-Host "`n--- ADMIN SERVICE LOGS ---" -ForegroundColor Cyan
docker-compose logs --tail=20 admin-service

Write-Host "`n--- DATABASE STATUS ---" -ForegroundColor Green
docker-compose exec postgres psql -U postgres -c "\l"

Write-Host "`n--- ENV CHECK ---" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists"
    Get-Content .env | Where-Object { $_ -match "JWT_SECRET|DB_PASSWORD" }
} else {
    Write-Host "❌ .env file missing!"
}
