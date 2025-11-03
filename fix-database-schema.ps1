# ===== FIX DATABASE SCHEMA - IMPORT SQL FILE =====

Write-Host "=== FIXING DATABASE SCHEMA ===" -ForegroundColor Cyan

# Step 1: Check if database has tables
Write-Host "`n[1] Checking current database state..." -ForegroundColor Yellow
docker exec dubaomatrung-postgres psql -U postgres -d auth_db -c "\dt"

# Step 2: Import SQL file
Write-Host "`n[2] Importing auth database schema and data..." -ForegroundColor Yellow
Write-Host "This will recreate the database with all tables and data..." -ForegroundColor Cyan

# Copy SQL file into container
docker cp docker-init/postgres/01-auth-db.sql dubaomatrung-postgres:/tmp/auth-db.sql

# Execute SQL file
Write-Host "Executing SQL import (this may take 1-2 minutes)..." -ForegroundColor Yellow
docker exec dubaomatrung-postgres psql -U postgres -f /tmp/auth-db.sql

# Step 3: Verify tables were created
Write-Host "`n[3] Verifying tables were created..." -ForegroundColor Yellow
docker exec dubaomatrung-postgres psql -U postgres -d auth_db -c "\dt"

# Step 4: Check User table has data
Write-Host "`n[4] Checking User table has data..." -ForegroundColor Yellow
docker exec dubaomatrung-postgres psql -U postgres -d auth_db -c "SELECT id, username, full_name FROM \"User\" LIMIT 5;"

# Step 5: Restart auth-service to reconnect with new schema
Write-Host "`n[5] Restarting auth-service..." -ForegroundColor Yellow
docker-compose restart auth-service

Write-Host "`nWaiting 10 seconds for auth-service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 6: Check auth-service logs
Write-Host "`n[6] Checking auth-service logs..." -ForegroundColor Cyan
docker-compose logs auth-service --tail=15

# Step 7: Test health endpoint
Write-Host "`n[7] Testing auth-service health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "SUCCESS! Auth-service is healthy!" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)"
} catch {
    Write-Host "WARNING: Health check failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

# Step 8: Test login
Write-Host "`n[8] Testing login..." -ForegroundColor Cyan
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

    # Parse and display token
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "Token received: YES" -ForegroundColor Green
    Write-Host "User: $($responseData.user.username)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! Login error" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"

    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== DATABASE SCHEMA FIX COMPLETE ===" -ForegroundColor Green
Write-Host "If login still fails, check the logs above for errors" -ForegroundColor Yellow
