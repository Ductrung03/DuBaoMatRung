# Hướng Dẫn Deploy Thủ Công Lên Windows Server

## Thông Tin Server
- **URL**: http://103.56.160.66/
- **OS**: Windows Server
- **Deployment**: Manual (Không dùng Docker)

---

## I. YÊU CẦU HỆ THỐNG

### 1. Phần Mềm Cần Cài Đặt

#### Node.js & NPM
```bash
# Download và cài đặt Node.js LTS (v18.x hoặc v20.x)
# Tải từ: https://nodejs.org/
# Kiểm tra version sau khi cài:
node --version  # v18.x hoặc v20.x
npm --version   # v8.x hoặc v10.x
```

#### PostgreSQL 15
```bash
# Download và cài đặt PostgreSQL 15
# Tải từ: https://www.postgresql.org/download/windows/
# Trong quá trình cài đặt:
# - Chọn port: 5432
# - Đặt password cho user postgres
# - Cài đặt PostGIS extension
```

#### MongoDB
```bash
# Download và cài đặt MongoDB Community Server
# Tải từ: https://www.mongodb.com/try/download/community
# Chọn phiên bản mới nhất cho Windows
# Port mặc định: 27017
```

#### Redis
```bash
# Download Redis cho Windows
# Tải từ: https://github.com/microsoftarchive/redis/releases
# Hoặc dùng Memurai (Redis compatible): https://www.memurai.com/
# Port mặc định: 6379
```

#### MapServer (cho GIS Service)
```bash
# Download MS4W (MapServer for Windows)
# Tải từ: https://ms4w.com/
# Giải nén vào C:\ms4w\
```

---

## II. CÀI ĐẶT & CẤU HÌNH CƠ SỞ DỮ LIỆU

### 1. Cấu Hình PostgreSQL

#### Bước 1: Kết nối PostgreSQL
```cmd
# Mở Command Prompt hoặc PowerShell
# Kết nối vào PostgreSQL
psql -U postgres
```

#### Bước 2: Tạo Databases
```sql
-- Tạo database cho Admin Service
CREATE DATABASE admin_db;

-- Tạo database cho GIS Service
CREATE DATABASE gis_db;

-- Cài đặt PostGIS extension cho GIS
\c gis_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Thoát
\q
```

#### Bước 3: Import Dữ Liệu (nếu có backup)
```cmd
# Nếu có file backup .sql
psql -U postgres -d admin_db < path\to\admin_db_backup.sql
psql -U postgres -d gis_db < path\to\gis_db_backup.sql
```

### 2. Cấu Hình MongoDB

MongoDB thường tự động chạy sau khi cài đặt. Kiểm tra:
```cmd
# Kiểm tra MongoDB đang chạy
net start MongoDB

# Nếu chưa chạy, start service
net start MongoDB
```

### 3. Cấu Hình Redis

```cmd
# Start Redis service
net start Redis

# Hoặc nếu dùng Memurai
net start Memurai
```

---

## III. CẤU HÌNH PROJECT

### 1. Clone/Copy Project

Nếu chưa có project trên server:
```cmd
# Clone từ Git (nếu dùng Git)
git clone <repository-url> C:\DuBaoMatRung

# Hoặc copy thủ công project đã có
```

### 2. Cài Đặt Dependencies

#### Frontend (Client)
```cmd
cd C:\DuBaoMatRung\client
npm install
```

#### Backend Services
```cmd
# Gateway
cd C:\DuBaoMatRung\microservices\gateway
npm install

# Auth Service
cd C:\DuBaoMatRung\microservices\services\auth-service
npm install
npx prisma generate
npx prisma migrate deploy

# User Service
cd C:\DuBaoMatRung\microservices\services\user-service
npm install

# GIS Service
cd C:\DuBaoMatRung\microservices\services\gis-service
npm install

# Report Service
cd C:\DuBaoMatRung\microservices\services\report-service
npm install

# Admin Service
cd C:\DuBaoMatRung\microservices\services\admin-service
npm install

# Search Service
cd C:\DuBaoMatRung\microservices\services\search-service
npm install

# MapServer Service
cd C:\DuBaoMatRung\microservices\services\mapserver-service
npm install
```

### 3. Tạo File .env

#### Gateway (.env)
```env
# File: microservices/gateway/.env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REDIS_HOST=localhost
REDIS_PORT=6379

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GIS_SERVICE_URL=http://localhost:3003
REPORT_SERVICE_URL=http://localhost:3004
ADMIN_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3006
MAPSERVER_SERVICE_URL=http://localhost:3007
```

#### Auth Service (.env)
```env
# File: microservices/services/auth-service/.env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/admin_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### User Service (.env)
```env
# File: microservices/services/user-service/.env
NODE_ENV=production
PORT=3002

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### GIS Service (.env)
```env
# File: microservices/services/gis-service/.env
NODE_ENV=production
PORT=3003

# PostgreSQL with PostGIS
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gis_db
DB_USER=postgres
DB_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gis_db

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

#### Report Service (.env)
```env
# File: microservices/services/report-service/.env
NODE_ENV=production
PORT=3004

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gis_db
DB_USER=postgres
DB_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/report_db
```

#### Admin Service (.env)
```env
# File: microservices/services/admin-service/.env
NODE_ENV=production
PORT=3005

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_db
DB_USER=postgres
DB_PASSWORD=your_password
```

#### Search Service (.env)
```env
# File: microservices/services/search-service/.env
NODE_ENV=production
PORT=3006

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gis_db
DB_USER=postgres
DB_PASSWORD=your_password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gis_db
```

#### MapServer Service (.env)
```env
# File: microservices/services/mapserver-service/.env
NODE_ENV=production
PORT=3007

# MapServer
MAPSERVER_PATH=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles
```

---

## IV. BUILD FRONTEND

```cmd
cd C:\DuBaoMatRung\client

# Build production
npm run build

# Kết quả build sẽ nằm trong folder dist/
# Folder dist/ này sẽ được serve bởi web server (IIS hoặc Nginx)
```

---

## V. CHẠY SERVICES

### Cách 1: Chạy Thủ Công Từng Service (Development/Testing)

Mở 8 cửa sổ Command Prompt/PowerShell riêng biệt:

```cmd
# Cửa sổ 1: Gateway
cd C:\DuBaoMatRung\microservices\gateway
npm start

# Cửa sổ 2: Auth Service
cd C:\DuBaoMatRung\microservices\services\auth-service
npm start

# Cửa sổ 3: User Service
cd C:\DuBaoMatRung\microservices\services\user-service
npm start

# Cửa sổ 4: GIS Service
cd C:\DuBaoMatRung\microservices\services\gis-service
npm start

# Cửa sổ 5: Report Service
cd C:\DuBaoMatRung\microservices\services\report-service
npm start

# Cửa sổ 6: Admin Service
cd C:\DuBaoMatRung\microservices\services\admin-service
npm start

# Cửa sổ 7: Search Service
cd C:\DuBaoMatRung\microservices\services\search-service
npm start

# Cửa sổ 8: MapServer Service
cd C:\DuBaoMatRung\microservices\services\mapserver-service
npm start
```

### Cách 2: Dùng PM2 (Production - Khuyên Dùng)

#### Cài đặt PM2
```cmd
npm install -g pm2
npm install -g pm2-windows-startup

# Cấu hình PM2 tự động start khi Windows khởi động
pm2-startup install
```

#### Tạo File ecosystem.config.js
Tạo file `ecosystem.config.js` tại thư mục gốc project:

```javascript
module.exports = {
  apps: [
    {
      name: 'gateway',
      cwd: 'C:\\DuBaoMatRung\\microservices\\gateway',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'auth-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\auth-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'user-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\user-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'gis-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\gis-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'report-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\report-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'admin-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\admin-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'search-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\search-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'mapserver-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\mapserver-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3007
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
```

#### Chạy PM2
```cmd
# Start tất cả services
pm2 start ecosystem.config.js

# Lưu cấu hình để tự động start khi reboot
pm2 save

# Kiểm tra status
pm2 status

# Xem logs
pm2 logs

# Restart một service
pm2 restart gateway

# Restart tất cả
pm2 restart all

# Stop tất cả
pm2 stop all

# Delete tất cả
pm2 delete all
```

---

## VI. CẤU HÌNH WEB SERVER

### Cách 1: Dùng IIS (Internet Information Services)

#### Bước 1: Cài đặt IIS
1. Mở **Server Manager**
2. Click **Add roles and features**
3. Chọn **Web Server (IIS)**
4. Cài đặt **URL Rewrite Module** từ: https://www.iis.net/downloads/microsoft/url-rewrite

#### Bước 2: Cài đặt iisnode
```cmd
# Download và cài đặt iisnode
# Tải từ: https://github.com/Azure/iisnode
```

#### Bước 3: Tạo Website trong IIS
1. Mở **IIS Manager**
2. Right-click **Sites** → **Add Website**
   - **Site name**: DuBaoMatRung
   - **Physical path**: `C:\DuBaoMatRung\client\dist`
   - **Binding**:
     - Type: http
     - IP: All Unassigned
     - Port: 80

#### Bước 4: Cấu Hình Reverse Proxy cho API
Tạo file `web.config` trong `C:\DuBaoMatRung\client\dist\`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- API Gateway Proxy -->
        <rule name="API Gateway" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>

        <!-- SPA Fallback -->
        <rule name="SPA Fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- CORS Headers -->
    <httpProtocol>
      <customHeaders>
        <add name="Access-Control-Allow-Origin" value="*" />
        <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
        <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
      </customHeaders>
    </httpProtocol>

    <!-- Static Files -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
  </system.webServer>
</configuration>
```

#### Bước 5: Cấu Hình Firewall
```cmd
# Mở port 80 cho HTTP
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=TCP localport=80

# Nếu dùng HTTPS (port 443)
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=TCP localport=443
```

### Cách 2: Dùng Nginx cho Windows

#### Cài đặt Nginx
```cmd
# Download Nginx for Windows
# Tải từ: http://nginx.org/en/download.html
# Giải nén vào C:\nginx
```

#### Cấu hình Nginx
Sửa file `C:\nginx\conf\nginx.conf`:

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
        server 127.0.0.1:3000;
    }

    server {
        listen 80;
        server_name 103.56.160.66;

        # Root folder cho frontend
        root C:/DuBaoMatRung/client/dist;
        index index.html;

        # API Gateway Proxy
        location /api/ {
            proxy_pass http://api_gateway/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### Chạy Nginx
```cmd
# Start Nginx
cd C:\nginx
start nginx

# Reload config
nginx -s reload

# Stop Nginx
nginx -s stop
```

#### Tạo Windows Service cho Nginx (Optional)
```cmd
# Download NSSM (Non-Sucking Service Manager)
# Tải từ: https://nssm.cc/download

# Cài đặt Nginx như một service
nssm install Nginx "C:\nginx\nginx.exe"
nssm set Nginx AppDirectory "C:\nginx"
nssm start Nginx
```

---

## VII. KIỂM TRA & TESTING

### 1. Kiểm Tra Services
```cmd
# Kiểm tra Gateway
curl http://localhost:3000/health

# Kiểm tra Auth Service
curl http://localhost:3001/health

# Tương tự cho các service khác...
```

### 2. Kiểm Tra Database Connections
```cmd
# Kiểm tra PostgreSQL
psql -U postgres -c "SELECT version();"

# Kiểm tra MongoDB
mongo --eval "db.version()"

# Kiểm tra Redis
redis-cli ping
```

### 3. Kiểm Tra Frontend
Mở trình duyệt và truy cập:
```
http://103.56.160.66/
```

### 4. Kiểm Tra API
```cmd
# Test login
curl -X POST http://103.56.160.66/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"your_password\"}"
```

---

## VIII. MAINTENANCE & MONITORING

### 1. PM2 Monitoring
```cmd
# Xem real-time logs
pm2 logs

# Xem logs của một service cụ thể
pm2 logs gateway

# Xem monitoring dashboard
pm2 monit

# Flush logs
pm2 flush
```

### 2. Database Backup

#### PostgreSQL Backup
```cmd
# Backup admin_db
pg_dump -U postgres admin_db > C:\Backups\admin_db_%date:~-4,4%%date:~-7,2%%date:~-10,2%.sql

# Backup gis_db
pg_dump -U postgres gis_db > C:\Backups\gis_db_%date:~-4,4%%date:~-7,2%%date:~-10,2%.sql
```

#### MongoDB Backup
```cmd
# Backup tất cả databases
mongodump --out C:\Backups\mongodb_%date:~-4,4%%date:~-7,2%%date:~-10,2%
```

### 3. Tạo Scheduled Tasks cho Backup (Windows Task Scheduler)

1. Mở **Task Scheduler**
2. Tạo task mới:
   - **Name**: Backup Databases
   - **Trigger**: Daily at 2:00 AM
   - **Action**: Start a program
   - **Program**: `C:\path\to\backup-script.bat`

Tạo file `backup-script.bat`:
```batch
@echo off
set BACKUP_DIR=C:\Backups
set DATE=%date:~-4,4%%date:~-7,2%%date:~-10,2%

:: PostgreSQL Backups
pg_dump -U postgres admin_db > %BACKUP_DIR%\admin_db_%DATE%.sql
pg_dump -U postgres gis_db > %BACKUP_DIR%\gis_db_%DATE%.sql

:: MongoDB Backup
mongodump --out %BACKUP_DIR%\mongodb_%DATE%

:: Delete backups older than 7 days
forfiles /p %BACKUP_DIR% /s /m *.* /d -7 /c "cmd /c del @path"
```

---

## IX. TROUBLESHOOTING

### 1. Service không start được
```cmd
# Kiểm tra logs
pm2 logs <service-name>

# Kiểm tra port có bị chiếm
netstat -ano | findstr :<port>

# Kill process đang chiếm port
taskkill /PID <pid> /F
```

### 2. Database connection error
- Kiểm tra PostgreSQL/MongoDB/Redis service đang chạy
- Kiểm tra firewall có block port không
- Kiểm tra credentials trong file .env

### 3. Frontend không load được
- Kiểm tra build đã chạy thành công chưa
- Kiểm tra IIS/Nginx config
- Kiểm tra file `dist/index.html` có tồn tại không

### 4. API không hoạt động
- Kiểm tra Gateway có chạy không
- Kiểm tra reverse proxy config trong IIS/Nginx
- Kiểm tra CORS headers

---

## X. UPDATE & DEPLOY LẠI

### Khi có code mới:

```cmd
# 1. Pull code mới (nếu dùng Git)
cd C:\DuBaoMatRung
git pull

# 2. Update dependencies (nếu có thay đổi)
cd client
npm install
cd ..\microservices\gateway
npm install
# ... tương tự cho các service khác

# 3. Build frontend
cd C:\DuBaoMatRung\client
npm run build

# 4. Restart services
pm2 restart all

# 5. Reload web server
# Nếu dùng Nginx:
nginx -s reload

# Nếu dùng IIS: Restart site trong IIS Manager
```

---

## XI. SECURITY CHECKLIST

- [ ] Đổi JWT_SECRET thành giá trị phức tạp, random
- [ ] Đổi password mặc định của PostgreSQL
- [ ] Cấu hình firewall chỉ mở port cần thiết (80, 443)
- [ ] Cấu hình HTTPS với SSL certificate
- [ ] Tắt các service không cần thiết
- [ ] Cấu hình backup tự động
- [ ] Set up monitoring và alerting
- [ ] Review và update dependencies thường xuyên
- [ ] Cấu hình rate limiting cho API
- [ ] Enable logging và log rotation

---

## XII. PORTS SUMMARY

| Service | Port |
|---------|------|
| IIS/Nginx | 80 (HTTP), 443 (HTTPS) |
| Gateway | 3000 |
| Auth Service | 3001 |
| User Service | 3002 |
| GIS Service | 3003 |
| Report Service | 3004 |
| Admin Service | 3005 |
| Search Service | 3006 |
| MapServer Service | 3007 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |

---

## XIII. LIÊN HỆ & HỖ TRỢ

Nếu gặp vấn đề trong quá trình deploy, hãy:
1. Kiểm tra logs: `pm2 logs`
2. Kiểm tra service status: `pm2 status`
3. Kiểm tra database connections
4. Review lại các bước cấu hình

**Chúc LuckyBoiz deploy thành công! 🚀**
