# Fix Environment Files Script
Write-Host "Dang sua file .env cho cac microservices..."

# Auth service .env content
$authContent = @'
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
'@

# GIS service .env content
$gisContent = @'
# GIS Service Environment

NODE_ENV=production
PORT=3003
LOG_LEVEL=info

# Database (PostGIS - port 5432 inside container)
DB_HOST=postgis
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=4
DB_NAME=gis_db

# JWT
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=

# Redis (Docker network)
REDIS_HOST=redis
REDIS_PORT=6379

# MongoDB for Logging (Docker network)
MONGODB_URI="mongodb://mongodb:27017/logging_db"

# Google Earth Engine
GEE_SERVICE_ACCOUNT_EMAIL=
GEE_PRIVATE_KEY_PATH=
GEE_PROJECT_ID=

# File Upload
MAX_FILE_SIZE=50mb
UPLOAD_DIR=./uploads

# Gateway URL (Docker network)
GATEWAY_URL=http://gateway:3000
'@

# Write files
$authContent | Set-Content -Path "microservices\services\auth-service\.env"
Write-Host "Da sua auth-service .env"

$gisContent | Set-Content -Path "microservices\services\gis-service\.env"
Write-Host "Da sua gis-service .env"

Write-Host "Hoan thanh! Chay: docker-compose restart auth-service gis-service"
