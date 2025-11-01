# 🚀 Hướng Dẫn Deployment Hệ Thống Lên Windows Server

> **Hệ thống:** Dự Báo Mất Rừng - DuBaoMatRung
> **Server:** Windows Server tại 103.56.161.239
> **Cách thức:** Đơn giản, nhanh chóng, dễ bảo trì

---

## 📋 Mục Lục

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Chuẩn Bị Ban Đầu](#chuẩn-bị-ban-đầu)
3. [Deploy Lần Đầu](#deploy-lần-đầu)
4. [Cập Nhật Code](#cập-nhật-code)
5. [Quản Lý Services](#quản-lý-services)
6. [Troubleshooting](#troubleshooting)
7. [Tự Động Hóa](#tự-động-hóa)

---

## 🔧 Yêu Cầu Hệ Thống

### Phần Mềm Cần Cài Đặt

Trước khi deploy, đảm bảo Windows Server đã cài đặt:

1. **Node.js** (>= 18.0.0)
   - Tải: https://nodejs.org/
   - Khuyến nghị: Node.js LTS (Long Term Support)

2. **Git for Windows**
   - Tải: https://git-scm.com/download/win
   - Cho phép clone và cập nhật code từ repository

3. **PostgreSQL** (>= 13.0)
   - Tải: https://www.postgresql.org/download/windows/
   - Database chính của hệ thống

4. **PM2** (Process Manager)
   - Tự động cài đặt qua script hoặc cài thủ công:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   pm2-startup install
   ```

### Cấu Hình Tối Thiểu

- **CPU:** 4 cores
- **RAM:** 8 GB (khuyến nghị 16 GB)
- **Disk:** 50 GB trống
- **Network:** Kết nối internet ổn định

---

## 🎬 Chuẩn Bị Ban Đầu

### Bước 1: Kết Nối Vào Server

Sử dụng Remote Desktop (RDP):
- Host: `103.56.161.239`
- Username: `administrator`
- Password: `=88LGj$ZIhF651gW4bt#`

Hoặc từ Linux/Mac sử dụng Remmina như bạn đã làm.

### Bước 2: Cấu Hình Git

Mở PowerShell với quyền Administrator và cấu hình Git:

```powershell
# Cấu hình thông tin Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Nếu repository là private, cấu hình credentials
git config --global credential.helper wincred
```

### Bước 3: Cấu Hình PostgreSQL

Mở pgAdmin hoặc sử dụng psql:

```powershell
# Tạo user cho database (nếu chưa có)
psql -U postgres
CREATE USER dubaomatrung WITH PASSWORD '4';
CREATE DATABASE dubaomatrung OWNER dubaomatrung;
GRANT ALL PRIVILEGES ON DATABASE dubaomatrung TO dubaomatrung;
\q
```

### Bước 4: Mở Firewall Ports

Mở Windows Defender Firewall và cho phép các ports sau:

```powershell
# Chạy PowerShell với quyền Administrator
New-NetFirewallRule -DisplayName "Gateway" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Auth Service" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "User Service" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "GIS Service" -Direction Inbound -LocalPort 3003 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Report Service" -Direction Inbound -LocalPort 3004 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Admin Service" -Direction Inbound -LocalPort 3005 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Search Service" -Direction Inbound -LocalPort 3006 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "MapServer Service" -Direction Inbound -LocalPort 3007 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Client Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

---

## 🚀 Deploy Lần Đầu

### Phương Án 1: Sử Dụng Script Tự Động (Khuyến Nghị)

#### Bước 1: Upload Script Lên Server

Copy file `deploy-windows.ps1` từ máy local lên server (qua Remote Desktop, copy/paste)

Hoặc tải trực tiếp từ Git:

```powershell
# Tạo thư mục tạm
New-Item -ItemType Directory -Path C:\DeployScripts -Force
cd C:\DeployScripts

# Clone repository (chỉ lấy scripts)
git clone --depth 1 --filter=blob:none --sparse https://github.com/luckyboiz/dubaomatrung.git
cd dubaomatrung
git sparse-checkout set deploy-windows.ps1 update-code.ps1

# Copy scripts ra ngoài
Copy-Item deploy-windows.ps1 C:\DeployScripts\
Copy-Item update-code.ps1 C:\DeployScripts\
```

#### Bước 2: Chỉnh Sửa Cấu Hình

Mở file `deploy-windows.ps1` và chỉnh sửa các thông tin:

```powershell
# Tìm và thay đổi:
$DB_PASSWORD = "your_password_here"  # Password PostgreSQL
$GIT_REPO = "https://github.com/luckyboiz/dubaomatrung.git"  # URL Git repo

# Nếu dùng private repo, có thể dùng:
# $GIT_REPO = "https://username:token@github.com/luckyboiz/dubaomatrung.git"
```

#### Bước 3: Chạy Script Deploy

Mở PowerShell với quyền Administrator:

```powershell
cd C:\DeployScripts

# Cho phép chạy script (chỉ cần 1 lần)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Deploy lần đầu
.\deploy-windows.ps1 -FirstTime
```

Script sẽ tự động:
- ✅ Kiểm tra yêu cầu hệ thống
- ✅ Clone code từ Git
- ✅ Tạo file .env
- ✅ Cài đặt dependencies
- ✅ Setup database
- ✅ Build frontend
- ✅ Khởi động tất cả services
- ✅ Hiển thị trạng thái

**Thời gian ước tính:** 10-15 phút (tùy tốc độ mạng)

---

### Phương Án 2: Deploy Thủ Công

Nếu script không hoạt động, bạn có thể deploy thủ công:

<details>
<summary>Nhấp để xem chi tiết deploy thủ công</summary>

#### Bước 1: Clone Repository

```powershell
cd C:\Projects
git clone https://github.com/luckyboiz/dubaomatrung.git DuBaoMatRung
cd DuBaoMatRung
```

#### Bước 2: Tạo File .env

Tạo file `microservices\.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dubaomatrung
DB_USER=dubaomatrung
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Ports
GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
GIS_SERVICE_PORT=3003
REPORT_SERVICE_PORT=3004
ADMIN_SERVICE_PORT=3005
SEARCH_SERVICE_PORT=3006
MAPSERVER_SERVICE_PORT=3007

# Environment
NODE_ENV=production
```

Tạo file `client\.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

#### Bước 3: Cài Dependencies

```powershell
# Root
npm install

# Microservices
cd microservices
npm install

# Client
cd ..\client
npm install
```

#### Bước 4: Build Frontend

```powershell
cd C:\Projects\DuBaoMatRung\client
npm run build
```

#### Bước 5: Khởi Động Services

```powershell
cd C:\Projects\DuBaoMatRung\microservices

# Khởi động từng service
pm2 start gateway/src/index.js --name gateway
pm2 start services/auth-service/src/index.js --name auth-service
pm2 start services/user-service/src/index.js --name user-service
pm2 start services/gis-service/src/index.js --name gis-service
pm2 start services/report-service/src/index.js --name report-service
pm2 start services/admin-service/src/index.js --name admin-service
pm2 start services/search-service/src/index.js --name search-service
pm2 start services/mapserver-service/src/index.js --name mapserver-service

# Serve frontend
pm2 serve C:\Projects\DuBaoMatRung\client\dist 5173 --name client --spa

# Lưu PM2 configuration
pm2 save
```

</details>

---

## 🔄 Cập Nhật Code

Khi bạn thay đổi code trên máy local và push lên Git, cập nhật trên server rất đơn giản:

### Phương Án 1: Script Tự Động (Nhanh Nhất)

```powershell
cd C:\DeployScripts
.\update-code.ps1
```

Script sẽ:
- Dừng services
- Pull code mới
- Cài dependencies mới (nếu có)
- Build frontend
- Khởi động lại services

**Thời gian:** 2-5 phút

### Phương Án 2: Cập Nhật Thủ Công

```powershell
# 1. Dừng services
pm2 stop all

# 2. Pull code
cd C:\Projects\DuBaoMatRung
git pull origin main

# 3. Cài dependencies mới (nếu có thay đổi package.json)
cd microservices
npm install
cd ..\client
npm install

# 4. Build frontend
npm run build

# 5. Khởi động lại
pm2 restart all
```

### Phương Án 3: Cập Nhật Không Downtime

Sử dụng PM2 reload để cập nhật từng service:

```powershell
cd C:\Projects\DuBaoMatRung
git pull

cd microservices
npm install

cd ..\client
npm install
npm run build

# Reload từng service (zero-downtime)
pm2 reload gateway
pm2 reload auth-service
pm2 reload user-service
pm2 reload gis-service
pm2 reload report-service
pm2 reload admin-service
pm2 reload search-service
pm2 reload mapserver-service
pm2 reload client
```

---

## 🎮 Quản Lý Services

### Các Lệnh PM2 Cơ Bản

```powershell
# Xem trạng thái tất cả services
pm2 status

# Xem logs realtime
pm2 logs

# Xem logs của service cụ thể
pm2 logs gateway
pm2 logs auth-service

# Khởi động lại service
pm2 restart gateway

# Khởi động lại tất cả
pm2 restart all

# Dừng service
pm2 stop gateway

# Dừng tất cả
pm2 stop all

# Xóa service
pm2 delete gateway

# Xóa tất cả
pm2 delete all

# Xem thông tin chi tiết
pm2 describe gateway

# Xem monitoring
pm2 monit
```

### Khởi Động Cùng Windows

PM2 đã được cấu hình để tự động khởi động khi Windows restart:

```powershell
# Lưu danh sách services hiện tại
pm2 save

# Kiểm tra startup configuration
pm2 startup
```

### Xem Logs Chi Tiết

```powershell
# Logs của tất cả services
pm2 logs

# Logs 200 dòng gần nhất
pm2 logs --lines 200

# Logs với timestamp
pm2 logs --timestamp

# Xóa logs cũ
pm2 flush

# Xem log files
cd C:\Users\Administrator\.pm2\logs
dir
```

---

## 🔥 Troubleshooting

### Lỗi Thường Gặp

#### 1. Port Already in Use

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Giải pháp:**
```powershell
# Tìm process đang dùng port
netstat -ano | findstr :3000

# Kill process (thay PID bằng số tìm được)
taskkill /PID <PID> /F

# Hoặc dùng PowerShell
Stop-Process -Id <PID> -Force
```

#### 2. Database Connection Failed

**Triệu chứng:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Giải pháp:**
```powershell
# Kiểm tra PostgreSQL service
Get-Service postgresql*

# Khởi động PostgreSQL
Start-Service postgresql-x64-13

# Kiểm tra kết nối
psql -U postgres -h localhost -p 5432
```

#### 3. PM2 Not Found

**Triệu chứng:**
```
pm2 : The term 'pm2' is not recognized
```

**Giải pháp:**
```powershell
# Cài đặt PM2
npm install -g pm2

# Hoặc khởi động lại PowerShell sau khi cài
```

#### 4. Git Pull Failed

**Triệu chứng:**
```
error: Your local changes to the following files would be overwritten by merge
```

**Giải pháp:**
```powershell
cd C:\Projects\DuBaoMatRung

# Xem các file thay đổi
git status

# Reset về trạng thái gốc (CẨN THẬN: mất mọi thay đổi local)
git reset --hard origin/main

# Hoặc stash changes
git stash
git pull
```

#### 5. Frontend Build Failed

**Triệu chứng:**
```
Error: JavaScript heap out of memory
```

**Giải pháp:**
```powershell
# Tăng memory limit cho Node.js
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 6. Services Not Auto-Starting

**Giải pháp:**
```powershell
# Re-configure PM2 startup
pm2 unstartup
pm2 startup

# Lưu lại danh sách
pm2 save
```

### Kiểm Tra Health

```powershell
# Kiểm tra API Gateway
curl http://localhost:3000/health

# Kiểm tra từng service
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3003/health  # GIS
curl http://localhost:3004/health  # Report
curl http://localhost:3005/health  # Admin
curl http://localhost:3006/health  # Search
curl http://localhost:3007/health  # MapServer

# Kiểm tra frontend
curl http://localhost:5173
```

---

## 🤖 Tự Động Hóa

### 1. Tạo Task Scheduler Để Tự Động Update

Tạo file `scheduled-update.ps1`:

```powershell
# Scheduled Update Script
$logFile = "C:\DeployScripts\Logs\update-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
New-Item -ItemType Directory -Path "C:\DeployScripts\Logs" -Force | Out-Null

Start-Transcript -Path $logFile

try {
    cd C:\DeployScripts
    .\update-code.ps1
    Write-Host "Update completed successfully"
} catch {
    Write-Host "Update failed: $_"
    # Gửi email thông báo lỗi (optional)
}

Stop-Transcript
```

Tạo Task trong Task Scheduler:
1. Mở Task Scheduler
2. Create Task
3. Triggers: Daily at 2:00 AM
4. Actions: `powershell.exe -File C:\DeployScripts\scheduled-update.ps1`

### 2. Webhook Tự Động Deploy Khi Push Git

Tạo file `webhook-server.js`:

```javascript
// Đơn giản: Lắng nghe webhook từ GitHub/GitLab
const express = require('express');
const { exec } = require('child_process');
const app = express();

app.post('/deploy', (req, res) => {
    console.log('Deploy webhook received');

    exec('powershell.exe C:\\DeployScripts\\update-code.ps1', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error}`);
            return res.status(500).send('Deploy failed');
        }
        console.log(stdout);
        res.send('Deploy started');
    });
});

app.listen(9000, () => {
    console.log('Webhook server running on port 9000');
});
```

Khởi động:
```powershell
pm2 start webhook-server.js --name webhook
```

Cấu hình webhook trong GitHub:
- URL: `http://103.56.161.239:9000/deploy`
- Content type: `application/json`
- Events: `push`

### 3. Monitoring & Alerts

Cài đặt PM2 Plus để monitoring trực quan:

```powershell
# Đăng ký tại https://id.keymetrics.io/
pm2 link <secret_key> <public_key>

# Xem dashboard tại https://app.pm2.io/
```

---

## 📊 Truy Cập Hệ Thống

Sau khi deploy thành công:

| Service | URL |
|---------|-----|
| **Frontend** | http://103.56.161.239:5173 |
| **API Gateway** | http://103.56.161.239:3000 |
| **API Docs** | http://103.56.161.239:3000/api-docs |
| **Auth Service** | http://103.56.161.239:3001 |
| **User Service** | http://103.56.161.239:3002 |
| **GIS Service** | http://103.56.161.239:3003 |
| **Report Service** | http://103.56.161.239:3004 |
| **Admin Service** | http://103.56.161.239:3005 |
| **Search Service** | http://103.56.161.239:3006 |
| **MapServer** | http://103.56.161.239:3007 |

---

## 📝 Workflow Cập Nhật Code Thường Ngày

1. **Trên máy local:**
   ```bash
   # Làm việc, commit, push
   git add .
   git commit -m "Update feature XYZ"
   git push origin main
   ```

2. **Trên Windows Server:**
   ```powershell
   # Cách 1: Tự động (nếu đã setup webhook)
   # Không cần làm gì, hệ thống tự động cập nhật

   # Cách 2: Chạy script
   cd C:\DeployScripts
   .\update-code.ps1

   # Cách 3: Thủ công nhanh
   cd C:\Projects\DuBaoMatRung
   git pull && npm run build:frontend && pm2 restart all
   ```

3. **Kiểm tra:**
   ```powershell
   pm2 status
   pm2 logs --lines 50
   ```

---

## 🔐 Bảo Mật

### 1. Thay Đổi Passwords

```powershell
# Database
psql -U postgres
ALTER USER dubaomatrung WITH PASSWORD 'new_strong_password';

# Cập nhật trong file .env
```

### 2. Sử Dụng HTTPS

Cài đặt IIS hoặc Nginx làm reverse proxy:

```
http://103.56.161.239 -> https://yourdomain.com
```

### 3. Giới Hạn Truy Cập

```powershell
# Chỉ cho phép IP cụ thể
New-NetFirewallRule -DisplayName "API Access" -Direction Inbound `
    -LocalPort 3000 -Protocol TCP -Action Allow `
    -RemoteAddress 192.168.1.0/24
```

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs: `pm2 logs`
2. Kiểm tra trạng thái: `pm2 status`
3. Xem hướng dẫn troubleshooting ở trên
4. Liên hệ team qua GitHub Issues

---

## 🎉 Tổng Kết

Với hướng dẫn này, bạn có thể:

✅ Deploy hệ thống lên Windows Server trong 10-15 phút
✅ Cập nhật code mới trong 2-5 phút
✅ Quản lý services dễ dàng với PM2
✅ Tự động hóa deployment
✅ Giải quyết các vấn đề thường gặp

**Chúc bạn deploy thành công!** 🚀
