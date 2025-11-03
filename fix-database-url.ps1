# ===== FIX DATABASE_URL IN AUTH-SERVICE =====
# Problem: Auth-service is trying to connect to localhost:5433 instead of postgres:5432

Write-Host "=== FIXING AUTH-SERVICE DATABASE CONNECTION ===" -ForegroundColor Cyan

# Step 1: Create correct .env file for auth-service
Write-Host "`n[1] Creating correct .env file for auth-service..." -ForegroundColor Yellow

$authEnvContent = @"
# Auth Service Configuration
PORT=3001
NODE_ENV=production

# Database URL for Prisma (PostgreSQL - port 5432)
DATABASE_URL="postgresql://postgres:4@postgres:5432/auth_db?schema=public"

# Individual DB components
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db

# JWT Secret
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# MongoDB for Logging (Docker network)
MONGODB_URI="mongodb://mongodb:27017/logging_db"

# Gateway URL (Docker network)
GATEWAY_URL=http://gateway:3000
"@

# Save to file
$authEnvContent | Out-File -FilePath "microservices\services\auth-service\.env" -Encoding UTF8 -NoNewline

Write-Host "Created: microservices\services\auth-service\.env" -ForegroundColor Green

# Step 2: Also create for search-service and admin-service (they are also restarting)
Write-Host "`n[2] Creating .env for search-service..." -ForegroundColor Yellow

$searchEnvContent = @"
# Search Service Configuration
PORT=3006
NODE_ENV=production

# Database (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db

# JWT Secret
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=

# MongoDB for Logging
MONGODB_URI="mongodb://mongodb:27017/logging_db"

# Gateway URL
GATEWAY_URL=http://gateway:3000
"@

$searchEnvContent | Out-File -FilePath "microservices\services\search-service\.env" -Encoding UTF8 -NoNewline
Write-Host "Created: microservices\services\search-service\.env" -ForegroundColor Green

# Step 3: Create for admin-service
Write-Host "`n[3] Creating .env for admin-service..." -ForegroundColor Yellow

$adminEnvContent = @"
# Admin Service Configuration
PORT=3005
NODE_ENV=production

# Database (PostGIS)
DB_HOST=admin-postgis
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=admin_db

# JWT Secret
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=

# MongoDB for Logging
MONGODB_URI="mongodb://mongodb:27017/logging_db"

# Gateway URL
GATEWAY_URL=http://gateway:3000
"@

$adminEnvContent | Out-File -FilePath "microservices\services\admin-service\.env" -Encoding UTF8 -NoNewline
Write-Host "Created: microservices\services\admin-service\.env" -ForegroundColor Green

# Step 4: Stop and remove the containers
Write-Host "`n[4] Stopping and removing problematic containers..." -ForegroundColor Yellow
docker-compose stop auth-service search-service admin-service
docker-compose rm -f auth-service search-service admin-service

# Step 5: Rebuild and start
Write-Host "`n[5] Rebuilding and starting services..." -ForegroundColor Yellow
docker-compose up -d --build auth-service search-service admin-service

# Step 6: Wait for services to start
Write-Host "`n[6] Waiting 15 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 7: Check status
Write-Host "`n[7] Checking container status..." -ForegroundColor Cyan
docker-compose ps

# Step 8: Check logs
Write-Host "`n[8] Checking auth-service logs (last 10 lines)..." -ForegroundColor Cyan
docker-compose logs auth-service --tail=10

Write-Host "`n[9] Checking search-service logs (last 10 lines)..." -ForegroundColor Cyan
docker-compose logs search-service --tail=10

Write-Host "`n[10] Checking admin-service logs (last 10 lines)..." -ForegroundColor Cyan
docker-compose logs admin-service --tail=10

# Step 9: Test auth-service health
Write-Host "`n[11] Testing auth-service health endpoint..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "SUCCESS! Auth-service is running!" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)"
} catch {
    Write-Host "WARNING: Auth-service health check failed. Check logs above." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

# Step 10: Test login
Write-Host "`n[12] Testing login endpoint..." -ForegroundColor Cyan
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
} catch {
    Write-Host "Login test failed. Checking if it's still starting..." -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "`nTry again in 30 seconds with: .\fix-auth-service.ps1" -ForegroundColor Yellow
}

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "If services are still restarting, wait 1-2 minutes and check:" -ForegroundColor Yellow
Write-Host "  docker-compose logs auth-service --tail=20" -ForegroundColor Cyan
Write-Host "  docker-compose logs search-service --tail=20" -ForegroundColor Cyan
Write-Host "  docker-compose logs admin-service --tail=20" -ForegroundColor Cyan
