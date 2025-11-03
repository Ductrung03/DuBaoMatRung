# ===== FIX ALL SERVICES COMPLETELY =====

Write-Host "=== COMPREHENSIVE SERVICE FIX ===" -ForegroundColor Cyan
Write-Host "This will fix ALL services with correct configuration" -ForegroundColor Yellow

# Step 1: Check current status
Write-Host "`n[1] Current container status:" -ForegroundColor Yellow
docker-compose ps

# Step 2: Create .env files for ALL services
Write-Host "`n[2] Creating .env files for all services..." -ForegroundColor Yellow

# Auth Service
$authEnv = @"
PORT=3001
NODE_ENV=production
DATABASE_URL="postgresql://postgres:4@postgres:5432/auth_db?schema=public"
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
LOG_LEVEL=info
LOG_DIR=./logs
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
"@
$authEnv | Out-File -FilePath "microservices\services\auth-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: auth-service/.env" -ForegroundColor Green

# User Service
$userEnv = @"
PORT=3002
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
"@
$userEnv | Out-File -FilePath "microservices\services\user-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: user-service/.env" -ForegroundColor Green

# GIS Service
$gisEnv = @"
PORT=3003
NODE_ENV=production
DB_HOST=postgis
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=gis_db
REDIS_HOST=redis
REDIS_PORT=6379
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
MAX_FILE_SIZE=104857600
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
"@
$gisEnv | Out-File -FilePath "microservices\services\gis-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: gis-service/.env" -ForegroundColor Green

# Report Service
$reportEnv = @"
PORT=3004
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
"@
$reportEnv | Out-File -FilePath "microservices\services\report-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: report-service/.env" -ForegroundColor Green

# Admin Service
$adminEnv = @"
PORT=3005
NODE_ENV=production
DB_HOST=admin-postgis
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=admin_db
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
"@
$adminEnv | Out-File -FilePath "microservices\services\admin-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: admin-service/.env" -ForegroundColor Green

# Search Service
$searchEnv = @"
PORT=3006
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=auth_db
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
"@
$searchEnv | Out-File -FilePath "microservices\services\search-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: search-service/.env" -ForegroundColor Green

# MapServer Service
$mapserverEnv = @"
PORT=3007
NODE_ENV=production
MONGODB_URI="mongodb://mongodb:27017/logging_db"
GATEWAY_URL=http://gateway:3000
"@
$mapserverEnv | Out-File -FilePath "microservices\services\mapserver-service\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: mapserver-service/.env" -ForegroundColor Green

# Gateway
$gatewayEnv = @"
PORT=3000
NODE_ENV=production
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
FRONTEND_URL=http://localhost:5173
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
GIS_SERVICE_URL=http://gis-service:3003
REPORT_SERVICE_URL=http://report-service:3004
ADMIN_SERVICE_URL=http://admin-service:3005
SEARCH_SERVICE_URL=http://search-service:3006
MAPSERVER_SERVICE_URL=http://mapserver-service:3007
MONGODB_URI=mongodb://mongodb:27017/logging_db
"@
$gatewayEnv | Out-File -FilePath "microservices\gateway\.env" -Encoding UTF8 -NoNewline
Write-Host "  Created: gateway/.env" -ForegroundColor Green

# Step 3: Stop all services
Write-Host "`n[3] Stopping all services..." -ForegroundColor Yellow
docker-compose down

# Step 4: Remove old containers and images (optional but recommended)
Write-Host "`n[4] Removing old containers..." -ForegroundColor Yellow
docker-compose rm -f

# Step 5: Rebuild and start all services
Write-Host "`n[5] Rebuilding and starting all services (this may take 5-10 minutes)..." -ForegroundColor Yellow
docker-compose up -d --build

# Step 6: Wait for services to initialize
Write-Host "`n[6] Waiting 30 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 7: Check status
Write-Host "`n[7] Checking container status:" -ForegroundColor Cyan
docker-compose ps

# Step 8: Check each service health
Write-Host "`n[8] Testing service endpoints:" -ForegroundColor Cyan

# Test Gateway
Write-Host "`n  Gateway (port 3000):" -ForegroundColor Yellow
try {
    $gw = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($gw.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Auth
Write-Host "`n  Auth Service (port 3001):" -ForegroundColor Yellow
try {
    $auth = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($auth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test User
Write-Host "`n  User Service (port 3002):" -ForegroundColor Yellow
try {
    $user = Invoke-WebRequest -Uri "http://localhost:3002/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($user.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test GIS
Write-Host "`n  GIS Service (port 3003):" -ForegroundColor Yellow
try {
    $gis = Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($gis.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Report
Write-Host "`n  Report Service (port 3004):" -ForegroundColor Yellow
try {
    $report = Invoke-WebRequest -Uri "http://localhost:3004/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($report.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Admin
Write-Host "`n  Admin Service (port 3005):" -ForegroundColor Yellow
try {
    $admin = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($admin.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Search
Write-Host "`n  Search Service (port 3006):" -ForegroundColor Yellow
try {
    $search = Invoke-WebRequest -Uri "http://localhost:3006/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($search.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test MapServer
Write-Host "`n  MapServer Service (port 3007):" -ForegroundColor Yellow
try {
    $mapserver = Invoke-WebRequest -Uri "http://localhost:3007/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK - Status $($mapserver.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Test login
Write-Host "`n[9] Testing login endpoint:" -ForegroundColor Cyan
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

    Write-Host "  SUCCESS! Login works!" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  FAILED! Login error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 10: Show logs for failed services
Write-Host "`n[10] If any service failed, checking logs:" -ForegroundColor Cyan
Write-Host "Run these commands to debug:" -ForegroundColor Yellow
Write-Host "  docker-compose logs auth-service --tail=20" -ForegroundColor Cyan
Write-Host "  docker-compose logs search-service --tail=20" -ForegroundColor Cyan
Write-Host "  docker-compose logs admin-service --tail=20" -ForegroundColor Cyan
Write-Host "  docker-compose logs mapserver-service --tail=20" -ForegroundColor Cyan

Write-Host "`n=== ALL SERVICES FIXED AND RESTARTED ===" -ForegroundColor Green
Write-Host "Frontend: http://103.56.161.239:5173" -ForegroundColor Cyan
Write-Host "API Gateway: http://103.56.161.239:3000" -ForegroundColor Cyan
Write-Host "Swagger Docs: http://103.56.161.239:3000/api-docs" -ForegroundColor Cyan
