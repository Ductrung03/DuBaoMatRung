# Deploy DuBaoMatRung lên Windows Server (Không dùng Docker)

## Yêu Cầu Trên Server

### 1. Phần mềm cần cài đặt

```powershell
# Node.js 18+ (LTS)
https://nodejs.org/

# PostgreSQL 15+
https://www.postgresql.org/download/windows/

# Redis cho Windows
https://github.com/tporadowski/redis/releases

# PM2 (process manager)
npm install -g pm2
npm install -g pm2-windows-service

# Nginx (web server/reverse proxy)
https://nginx.org/en/download.html
```

### 2. Cài đặt MapServer (Optional - nếu dùng GIS)

```
Download OSGeo4W: https://trac.osgeo.org/osgeo4w/
Chọn: MapServer, GDAL, PROJ
```

## Bước 1: Chuẩn Bị Trên Máy Hiện Tại

### Script: `prepare-deploy.ps1`

```powershell
# Tạo thư mục deploy
New-Item -ItemType Directory -Force -Path ".\deploy-package"

# Copy source code (loại trừ node_modules, .git)
$exclude = @('node_modules', '.git', 'dist', 'build', 'deploy-package', '*.log')
Get-ChildItem -Path . -Exclude $exclude | Copy-Item -Destination ".\deploy-package" -Recurse -Force

# Copy các file cần thiết
Copy-Item ".env.example" ".\deploy-package\.env"
Copy-Item "package.json" ".\deploy-package\"

Write-Host "✅ Deploy package ready tại: .\deploy-package\"
Write-Host "📦 Zip folder này và copy lên server"
```

## Bước 2: Setup Trên Server

### 2.1. Giải nén và cài dependencies

```powershell
# Di chuyển vào thư mục
cd C:\inetpub\wwwroot\DuBaoMatRung

# Cài dependencies cho microservices
cd microservices
npm install
npm run install:all

# Cài dependencies cho frontend
cd ..\client
npm install

cd ..
```

### 2.2. Cấu hình Database

```powershell
# Tạo databases
psql -U postgres
CREATE DATABASE auth_db;
CREATE DATABASE gis_db;
\q

# Setup Prisma
cd microservices\services\auth-service
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 2.3. Cấu hình Environment Variables

Chỉnh sửa `.env`:

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME_AUTH=auth_db
DB_NAME_GIS=gis_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_production_secret_here
REFRESH_TOKEN_SECRET=your_refresh_secret_here

# Services URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GIS_SERVICE_URL=http://localhost:3003
REPORT_SERVICE_URL=http://localhost:3004
ADMIN_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3006
MAPSERVER_SERVICE_URL=http://localhost:3007
```

## Bước 3: Build Frontend

```powershell
cd client
npm run build

# Kết quả ở: client/dist
```

## Bước 4: Start Services với PM2

### 4.1. Tạo ecosystem.config.js

File: `ecosystem.config.js` (trong thư mục gốc)

```javascript
module.exports = {
  apps: [
    // Gateway
    {
      name: 'gateway',
      cwd: './microservices/gateway',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    // Auth Service
    {
      name: 'auth-service',
      cwd: './microservices/services/auth-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    // User Service
    {
      name: 'user-service',
      cwd: './microservices/services/user-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    // GIS Service
    {
      name: 'gis-service',
      cwd: './microservices/services/gis-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
    // Report Service
    {
      name: 'report-service',
      cwd: './microservices/services/report-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    },
    // Admin Service
    {
      name: 'admin-service',
      cwd: './microservices/services/admin-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    },
    // Search Service
    {
      name: 'search-service',
      cwd: './microservices/services/search-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      }
    },
    // MapServer Service
    {
      name: 'mapserver-service',
      cwd: './microservices/services/mapserver-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3007
      }
    }
  ]
};
```

### 4.2. Start tất cả services

```powershell
# Start all
pm2 start ecosystem.config.js

# Kiểm tra status
pm2 status

# Xem logs
pm2 logs

# Save configuration để auto-start khi reboot
pm2 save
pm2-startup install
```

## Bước 5: Cấu hình Nginx

### nginx.conf

File: `C:\nginx\conf\nginx.conf`

```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    # Upstream cho API Gateway
    upstream api_gateway {
        server localhost:3000;
    }

    # Frontend + API Proxy
    server {
        listen 80;
        server_name localhost;

        # Frontend (React build)
        location / {
            root C:/inetpub/wwwroot/DuBaoMatRung/client/dist;
            try_files $uri $uri/ /index.html;
            index index.html;
        }

        # API Proxy
        location /api/ {
            proxy_pass http://api_gateway/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # MapServer (nếu có)
        location /mapserver/ {
            proxy_pass http://localhost:3007/;
        }
    }
}
```

### Start Nginx

```powershell
cd C:\nginx
start nginx

# Reload config
nginx -s reload

# Stop
nginx -s stop
```

## Bước 6: Mở Firewall

```powershell
# Mở port 80 (HTTP)
New-NetFirewallRule -DisplayName "HTTP Port 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Mở port 3000-3007 (nếu cần truy cập trực tiếp)
New-NetFirewallRule -DisplayName "API Gateway" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## Script Tự Động Deploy

### `deploy-server.ps1`

```powershell
Write-Host "🚀 Deploying DuBaoMatRung..." -ForegroundColor Green

# 1. Stop services cũ
Write-Host "⏸️  Stopping services..." -ForegroundColor Yellow
pm2 stop all

# 2. Backup database (optional)
Write-Host "💾 Backing up database..." -ForegroundColor Yellow
$backupFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
pg_dump -U postgres auth_db > "backups\$backupFile"

# 3. Pull code mới (nếu dùng git)
# git pull origin main

# 4. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
cd microservices
npm install
npm run install:all

# 5. Run migrations
Write-Host "🗄️  Running migrations..." -ForegroundColor Yellow
cd services\auth-service
npx prisma migrate deploy
cd ..\..\..\

# 6. Build frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
cd client
npm run build
cd ..

# 7. Restart services
Write-Host "▶️  Starting services..." -ForegroundColor Yellow
pm2 restart all

# 8. Reload Nginx
Write-Host "🔄 Reloading Nginx..." -ForegroundColor Yellow
nginx -s reload

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Access app at: http://localhost" -ForegroundColor Cyan

# 9. Health check
Start-Sleep -Seconds 5
Invoke-RestMethod -Uri "http://localhost/api/health" -Method GET
```

## Kiểm Tra Deployment

```powershell
# Check PM2 services
pm2 status

# Check logs
pm2 logs gateway --lines 50

# Check Nginx
curl http://localhost
curl http://localhost/api/health

# Check database connection
psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM users;"
```

## Troubleshooting

### Service không start

```powershell
# Xem logs chi tiết
pm2 logs [service-name] --lines 100

# Restart một service cụ thể
pm2 restart auth-service

# Delete và start lại
pm2 delete auth-service
pm2 start ecosystem.config.js --only auth-service
```

### Database connection failed

```powershell
# Kiểm tra PostgreSQL đang chạy
Get-Service postgresql*

# Start PostgreSQL
Start-Service postgresql-x64-15

# Test connection
psql -U postgres -c "SELECT version();"
```

### Port conflict

```powershell
# Tìm process đang dùng port
netstat -ano | findstr :3000

# Kill process
taskkill /PID [PID] /F
```

## Update Code Sau Này

```powershell
# 1. Stop services
pm2 stop all

# 2. Pull code mới hoặc copy files mới

# 3. Install dependencies (nếu package.json thay đổi)
cd microservices && npm install

# 4. Run migrations (nếu có)
cd services\auth-service && npx prisma migrate deploy

# 5. Build frontend (nếu có thay đổi)
cd client && npm run build

# 6. Restart
pm2 restart all && nginx -s reload
```

## Monitoring

### PM2 Web Dashboard

```powershell
pm2 install pm2-server-monit
```

Truy cập: http://localhost:9615

### Logs Location

- PM2 logs: `C:\Users\[user]\.pm2\logs\`
- Nginx logs: `C:\nginx\logs\`
- Service logs: `microservices\services\[service-name]\logs\`

## Backup Strategy

```powershell
# Tạo script backup hàng ngày
# backup-daily.ps1

$date = Get-Date -Format "yyyyMMdd"
$backupDir = "C:\backups\$date"

New-Item -ItemType Directory -Force -Path $backupDir

# Backup databases
pg_dump -U postgres auth_db > "$backupDir\auth_db.sql"
pg_dump -U postgres gis_db > "$backupDir\gis_db.sql"

# Backup uploads
Copy-Item "uploads\" "$backupDir\uploads\" -Recurse

Write-Host "✅ Backup completed: $backupDir"
```

Thêm vào Task Scheduler để chạy hàng ngày.
