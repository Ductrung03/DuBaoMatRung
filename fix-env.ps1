# Fix Environment Files Script
# Sửa tất cả file .env để dùng Docker network hostnames

Write-Host "🔧 Đang sửa file .env cho các microservices..."

# Sửa auth-service .env
$authEnv = @"
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

# Sửa gis-service .env
$gisEnv = @"
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
"@

# Ghi file auth-service
try {
    $authEnv | Out-File -FilePath "microservices\services\auth-service\.env" -Encoding UTF8
    Write-Host "✅ Đã sửa microservices\services\auth-service\.env"
} catch {
    Write-Host "❌ Lỗi khi sửa auth-service .env: $_"
}

# Ghi file gis-service
try {
    $gisEnv | Out-File -FilePath "microservices\services\gis-service\.env" -Encoding UTF8
    Write-Host "✅ Đã sửa microservices\services\gis-service\.env"
} catch {
    Write-Host "❌ Lỗi khi sửa gis-service .env: $_"
}

Write-Host ""
Write-Host "🎉 Hoàn thành! Các thay đổi:"
Write-Host "   - localhost:5433 → postgres:5432 (auth-service)"
Write-Host "   - localhost:27017 → mongodb:27017 (MongoDB)"
Write-Host "   - localhost:6379 → redis:6379 (Redis)"
Write-Host "   - localhost:3000 → gateway:3000 (Gateway)"
Write-Host "   - localhost:5433 → postgis:5432 (gis-service)"
Write-Host ""
Write-Host "📝 Tiếp theo chạy: docker-compose restart auth-service gis-service"
