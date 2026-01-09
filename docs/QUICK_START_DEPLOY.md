# Quick Start: Deploy DuBaoMatRung lên Windows Server

## 🎯 Tóm Tắt 3 Bước

```powershell
# TRÊN MÁY HIỆN TẠI:
.\prepare-deploy.ps1

# SAU ĐÓ: Copy thư mục deploy-package lên server

# TRÊN SERVER:
.\setup-server.ps1
```

## Chi Tiết Từng Bước

### Bước 1: Chuẩn Bị Package (Trên máy hiện tại)

```powershell
cd C:\DuBaoMatRung

# Chạy script chuẩn bị
.\prepare-deploy.ps1
```

Script này sẽ:
- Tạo thư mục `deploy-package`
- Copy source code (loại trừ node_modules, .git)
- Tạo file `.env` từ template
- Hiển thị kích thước package

### Bước 2: Transfer Package Lên Server

**Option A: Network Share (Nhanh nhất nếu trong cùng mạng)**

```powershell
# Trên server, share một folder
# Ví dụ: \\192.168.1.100\deploy

# Trên máy hiện tại, copy
Copy-Item -Path ".\deploy-package\*" -Destination "\\192.168.1.100\deploy\" -Recurse
```

**Option B: USB Drive**

```powershell
# Copy vào USB
Copy-Item -Path ".\deploy-package" -Destination "E:\" -Recurse

# Cắm USB vào server và copy vào C:\
```

**Option C: Zip và transfer qua Remote Desktop**

```powershell
# Tạo file zip
Compress-Archive -Path ".\deploy-package\*" -DestinationPath "dubao-deploy.zip"

# Transfer qua RDP clipboard hoặc upload lên cloud (Google Drive, Dropbox, etc.)
```

### Bước 3: Setup Trên Server

```powershell
# Giải nén (nếu dùng zip)
Expand-Archive -Path "dubao-deploy.zip" -DestinationPath "C:\DuBaoMatRung"

# Di chuyển vào thư mục
cd C:\DuBaoMatRung

# Chạy setup script
.\setup-server.ps1
```

Script này sẽ tự động:
1. ✅ Kiểm tra Node.js, PostgreSQL, Redis
2. ✅ Tạo databases (auth_db, gis_db)
3. ✅ Install tất cả npm dependencies
4. ✅ Setup Prisma (generate, migrate, seed)
5. ✅ Build React frontend
6. ✅ Tạo các thư mục cần thiết
7. ✅ Mở firewall ports
8. ✅ Start tất cả services với PM2

## Yêu Cầu Trên Server

### Phần mềm cần cài SẴN (trước khi chạy setup):

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Chọn: LTS version
   - Installer sẽ tự động thêm vào PATH

2. **PostgreSQL 15+**
   - Download: https://www.postgresql.org/download/windows/
   - Nhớ mật khẩu user `postgres`

3. **Redis (Optional nhưng khuyên dùng)**
   - Download: https://github.com/tporadowski/redis/releases
   - Giải nén và chạy `redis-server.exe`

4. **PM2 (Script sẽ tự install nếu chưa có)**

5. **Git (Optional - chỉ nếu muốn pull code sau này)**
   - Download: https://git-scm.com/download/win

## Sau Khi Setup

### 1. Kiểm tra services đang chạy

```powershell
pm2 status
```

Bạn sẽ thấy 8 services:
- gateway (port 3000)
- auth-service (port 3001)
- user-service (port 3002)
- gis-service (port 3003)
- report-service (port 3004)
- admin-service (port 3005)
- search-service (port 3006)
- mapserver-service (port 3007)

### 2. Test API

```powershell
# Test API Gateway
curl http://localhost:3000/api/health

# Hoặc mở browser
# http://localhost:3000/api/health
```

### 3. Cấu hình .env cho Production

Mở file `.env` và cập nhật:

```env
NODE_ENV=production

# Database
DB_PASSWORD=your_strong_password_here

# JWT Secrets (PHẢI thay đổi!)
JWT_SECRET=your_random_secret_key_change_this
REFRESH_TOKEN_SECRET=your_refresh_secret_key_change_this

# Server IP (nếu deploy lên internet)
SERVER_IP=your_server_ip_or_domain
```

Sau khi sửa .env, restart services:

```powershell
pm2 restart all
```

### 4. Cài Nginx (Optional - để serve frontend)

**Download Nginx:**
- https://nginx.org/en/download.html
- Chọn: Windows version (stable)

**Giải nén vào C:\nginx**

**Copy config:**

Tạo file `C:\nginx\conf\nginx.conf`:

```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # API Gateway
    upstream api {
        server localhost:3000;
    }

    server {
        listen 80;
        server_name localhost;

        # Frontend
        location / {
            root C:/DuBaoMatRung/client/dist;
            try_files $uri $uri/ /index.html;
            index index.html;
        }

        # API Proxy
        location /api/ {
            proxy_pass http://api/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

**Start Nginx:**

```powershell
cd C:\nginx
start nginx

# Hoặc
nginx.exe
```

**Test:**

Mở browser: http://localhost

### 5. Setup Auto-Start (Chạy services khi server reboot)

```powershell
# Chạy PowerShell as Administrator
pm2-startup install

# Save PM2 config
pm2 save
```

## Quản Lý Services

### Xem tất cả services

```powershell
pm2 status
```

### Xem logs

```powershell
# Tất cả logs
pm2 logs

# Logs của một service
pm2 logs gateway
pm2 logs auth-service

# 50 dòng cuối
pm2 logs gateway --lines 50
```

### Restart services

```powershell
# Restart tất cả
pm2 restart all

# Restart một service
pm2 restart gateway
```

### Stop services

```powershell
# Stop tất cả
pm2 stop all

# Stop một service
pm2 stop gateway
```

## Troubleshooting

### Service không start

```powershell
# Xem lỗi chi tiết
pm2 logs auth-service --lines 100

# Restart service
pm2 restart auth-service --update-env
```

### Database connection failed

```powershell
# Kiểm tra PostgreSQL đang chạy
Get-Service postgresql*

# Nếu stopped, start lại
Start-Service postgresql-x64-15

# Test connection
psql -U postgres -c "SELECT version();"
```

### Port bị chiếm

```powershell
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kết quả: TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 12345
# 12345 là PID

# Kill process
taskkill /PID 12345 /F
```

### Nginx không start

```powershell
cd C:\nginx

# Test config
nginx -t

# Nếu có lỗi, sửa nginx.conf

# Start
start nginx

# Reload sau khi sửa config
nginx -s reload
```

## Update Code Sau Này

### Cách 1: Re-deploy toàn bộ

Làm lại 3 bước ở trên (prepare → transfer → setup)

### Cách 2: Update từng phần (nhanh hơn)

```powershell
# 1. Stop services
pm2 stop all

# 2. Backup code cũ
Copy-Item -Path "C:\DuBaoMatRung" -Destination "C:\Backups\DuBaoMatRung_backup_$(Get-Date -Format 'yyyyMMdd')" -Recurse

# 3. Copy code mới vào (ghi đè)

# 4. Install dependencies (nếu có thay đổi)
cd C:\DuBaoMatRung\microservices
npm install --production

# 5. Run migrations (nếu có)
cd services\auth-service
npx prisma migrate deploy

# 6. Rebuild frontend (nếu có thay đổi)
cd ..\..\client
npm run build

# 7. Restart
pm2 restart all
```

## Backup & Restore

### Backup Database

```powershell
# Tạo backup folder
New-Item -ItemType Directory -Force -Path "C:\Backups\DuBao"

# Backup databases
pg_dump -U postgres auth_db > "C:\Backups\DuBao\auth_db_$(Get-Date -Format 'yyyyMMdd').sql"
pg_dump -U postgres gis_db > "C:\Backups\DuBao\gis_db_$(Get-Date -Format 'yyyyMMdd').sql"
```

### Restore Database

```powershell
psql -U postgres -d auth_db -f "C:\Backups\DuBao\auth_db_20250610.sql"
```

## Monitoring

### PM2 Monitoring Dashboard

```powershell
# Install module
pm2 install pm2-server-monit

# Truy cập: http://localhost:9615
```

### Logs Location

- **PM2 logs**: `C:\Users\[user]\.pm2\logs\`
- **Service logs**: `C:\DuBaoMatRung\microservices\services\[service-name]\logs\`
- **Nginx logs**: `C:\nginx\logs\`

## Bảo Mật

### Checklist:

- [ ] Đổi JWT_SECRET và REFRESH_TOKEN_SECRET trong .env
- [ ] Đổi mật khẩu PostgreSQL `postgres` user
- [ ] Cấu hình firewall chỉ mở ports cần thiết
- [ ] Setup HTTPS với SSL certificate (dùng Let's Encrypt)
- [ ] Backup database định kỳ
- [ ] Không expose ports 3001-3007 ra internet (chỉ qua Gateway port 3000)

## Liên Hệ & Hỗ Trợ

- 📚 Full Documentation: [DEPLOY_WINDOWS_SERVER.md](DEPLOY_WINDOWS_SERVER.md)
- 📋 Project README: [CLAUDE.md](CLAUDE.md)

---

**Thời gian deploy ước tính:**
- Chuẩn bị package: 2-3 phút
- Transfer (tùy phương thức): 5-30 phút
- Setup trên server: 10-15 phút
- **Tổng: ~20-50 phút**
