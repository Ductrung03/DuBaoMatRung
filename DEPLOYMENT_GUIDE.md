# Hướng Dẫn Deploy Hệ Thống Dự Báo Mất Rừng

## Thông Tin Hệ Thống

### Công Nghệ Sử Dụng

- **PostgreSQL 17** - Database chính cho authentication, users, roles
- **PostGIS 17 (3.5)** - Database GIS cho dữ liệu không gian và admin
- **MongoDB 7.0** - Logging và audit trail
- **Redis 7** - Cache cho GIS service
- **Node.js** - Microservices backend
- **React + Vite** - Frontend

### Kiến Trúc Microservices

```
┌─────────────┐
│   Client    │ (Port 5173)
│  (React)    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Gateway   │ (Port 3000)
└──────┬──────┘
       │
       ├──────► Auth Service (3001)      ─┬─► PostgreSQL 17 (5432)
       ├──────► User Service (3002)      ─┤
       ├──────► GIS Service (3003)       ─┼─► PostGIS 17 (5433) + Redis (6379)
       ├──────► Report Service (3004)    ─┤
       ├──────► Admin Service (3005)     ─┼─► PostGIS 17 (5434)
       ├──────► Search Service (3006)    ─┤
       └──────► MapServer (3007)         ─┴─► MongoDB (27017)
```

## Yêu Cầu Hệ Thống

### Windows Server

- Windows Server 2019 hoặc mới hơn (khuyến nghị Windows Server 2022)
- RAM: Tối thiểu 8GB (khuyến nghị 16GB+)
- Ổ cứng: Tối thiểu 50GB trống
- CPU: 4 cores trở lên

### Phần Mềm Cần Cài

1. **Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop
   - Phiên bản: 4.25.0 trở lên
   - Enable WSL 2 backend

2. **Git for Windows** (tùy chọn, nếu cần clone từ repository)
   - Download: https://git-scm.com/download/win

## Hướng Dẫn Cài Đặt

### Bước 1: Chuẩn Bị

1. Cài đặt Docker Desktop và khởi động
2. Mở PowerShell với quyền Administrator
3. Clone hoặc copy project vào thư mục (ví dụ: `C:\Projects\DuBaoMatRung`)

```powershell
cd C:\Projects\DuBaoMatRung
```

### Bước 2: Chuẩn Bị Database Dumps

Đảm bảo có các file SQL trong thư mục `docker-init/`:

```
docker-init/
├── postgres/
│   └── 01-auth-db.sql          (Database authentication - ~30KB)
├── postgis/
│   └── 01-gis-db.sql           (Database GIS - ~12MB)
├── admin-postgis/
│   └── 01-admin-db.sql         (Database admin - ~1.9GB)
└── mongodb/
    └── logging_db.archive      (MongoDB dump - tùy chọn)
```

**Lưu ý**: File `01-admin-db.sql` rất lớn (1.9GB). Nếu chưa có, hệ thống sẽ tạo database trống.

### Bước 3: Cấu Hình Environment Variables

File `.env` sẽ được tạo tự động khi chạy lần đầu. Bạn có thể tạo trước:

```env
# Database Password (thay đổi trong production!)
DB_PASSWORD=postgres123

# JWT Secret (thay đổi trong production!)
JWT_SECRET=your-super-secret-jwt-key-here

# Environment
NODE_ENV=production

# Frontend URL (thay đổi theo domain của bạn)
FRONTEND_URL=http://your-domain.com:5173
```

### Bước 4: Deploy Lần Đầu

```powershell
# Deploy lần đầu (tự động import database)
.\deploy.ps1 -FirstTime
```

**Quá trình này sẽ:**
1. Pull Docker images (PostgreSQL 17, PostGIS 17, MongoDB 7, Redis 7)
2. Build tất cả microservices
3. Khởi động containers
4. Tự động import databases từ docker-init/

**Thời gian**: 10-20 phút (phụ thuộc vào tốc độ mạng và kích thước database)

### Bước 5: Kiểm Tra Trạng Thái

```powershell
# Xem trạng thái services
docker-compose ps

# Xem logs
.\deploy.ps1 -Logs

# Xem logs của service cụ thể
.\deploy.ps1 -Logs -Service auth-service
```

### Bước 6: Truy Cập Hệ Thống

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs (nếu có)

**Tài khoản mặc định:**
- Username: `admin`
- Password: `admin123` (hoặc theo database dump của bạn)

## Các Lệnh Quản Lý

### Quản Lý Services

```powershell
# Khởi động services
.\deploy.ps1

# Dừng tất cả services
.\deploy.ps1 -Stop

# Restart (không rebuild)
.\deploy.ps1 -Restart

# Restart service cụ thể
.\deploy.ps1 -Restart -Service "auth-service"

# Rebuild tất cả (khi thay đổi code)
.\deploy.ps1 -Rebuild

# Rebuild service cụ thể
.\deploy.ps1 -Rebuild -Service "client"
```

### Xem Logs

```powershell
# Xem tất cả logs
.\deploy.ps1 -Logs

# Xem logs service cụ thể
.\deploy.ps1 -Logs -Service "gateway"
.\deploy.ps1 -Logs -Service "admin-service"
```

### Backup & Restore Database

```powershell
# Export tất cả databases
.\deploy.ps1 -ExportDB

# Các file sẽ được lưu trong docker-init/
```

**Restore databases:**
1. Dừng services: `.\deploy.ps1 -Stop`
2. Xóa volumes: `docker-compose down -v`
3. Đặt file SQL mới vào docker-init/
4. Khởi động lại: `.\deploy.ps1 -FirstTime`

### Clean Up

```powershell
# Xóa tất cả (containers, volumes, images)
# CẢNH BÁO: Sẽ mất hết dữ liệu!
.\deploy.ps1 -CleanAll
```

## Truy Cập Database Trực Tiếp

### PostgreSQL (auth_db)

```powershell
# Kết nối vào container
docker exec -it dubaomatrung-postgres psql -U postgres -d auth_db

# Hoặc từ host machine (nếu có psql)
psql -h localhost -p 5432 -U postgres -d auth_db
```

### PostGIS (gis_db)

```powershell
docker exec -it dubaomatrung-postgis psql -U postgres -d gis_db

# Từ host
psql -h localhost -p 5433 -U postgres -d gis_db
```

### PostGIS (admin_db)

```powershell
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db

# Từ host
psql -h localhost -p 5434 -U postgres -d admin_db
```

### MongoDB

```powershell
# Kết nối vào container
docker exec -it dubaomatrung-mongodb mongosh

# Từ host (nếu có mongosh)
mongosh "mongodb://localhost:27017/logging_db"
```

### Redis

```powershell
# Kết nối vào container
docker exec -it dubaomatrung-redis redis-cli

# Test
docker exec dubaomatrung-redis redis-cli PING
# Kết quả: PONG
```

## Cấu Hình Production

### 1. Thay Đổi Passwords

Sửa file `.env`:

```env
# Tạo password mạnh
DB_PASSWORD=YourStrongPassword123!@#

# Tạo JWT secret ngẫu nhiên (dùng PowerShell)
# [guid]::NewGuid().ToString()
JWT_SECRET=abc123def456...
```

### 2. Cấu Hình Domain

Sửa `docker-compose.yml`:

```yaml
client:
  build:
    args:
      - VITE_API_URL=http://your-domain.com:3000  # Thay đổi URL
```

### 3. Cấu Hình CORS

Sửa environment variables trong `docker-compose.yml`:

```yaml
gateway:
  environment:
    - FRONTEND_URL=http://your-domain.com:5173
```

### 4. Tăng Resources cho Admin Database

Nếu admin_db rất lớn (>2GB), tăng memory limit trong `docker-compose.yml`:

```yaml
admin-postgis:
  deploy:
    resources:
      limits:
        memory: 8G  # Tăng từ 4G lên 8G
```

### 5. Backup Tự Động

Tạo scheduled task trong Windows để chạy backup định kỳ:

```powershell
# Tạo script backup: backup-daily.ps1
$date = Get-Date -Format "yyyy-MM-dd"
$backupDir = "C:\Backups\DuBaoMatRung\$date"
New-Item -ItemType Directory -Force -Path $backupDir

# Export databases
docker exec dubaomatrung-postgres pg_dump -U postgres -d auth_db > "$backupDir\auth_db.sql"
docker exec dubaomatrung-postgis pg_dump -U postgres -d gis_db > "$backupDir\gis_db.sql"
docker exec dubaomatrung-admin-postgis pg_dump -U postgres -d admin_db > "$backupDir\admin_db.sql"
docker exec dubaomatrung-mongodb mongodump --db=logging_db --archive > "$backupDir\logging_db.archive"

# Xóa backup cũ hơn 7 ngày
Get-ChildItem "C:\Backups\DuBaoMatRung" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Recurse
```

## Monitoring

### Kiểm Tra Health

```powershell
# Kiểm tra tất cả containers
docker-compose ps

# Kiểm tra resource usage
docker stats

# Kiểm tra logs của container cụ thể
docker logs dubaomatrung-gateway --tail 100 -f
```

### Kiểm Tra Kết Nối Database

```powershell
# PostgreSQL
docker exec dubaomatrung-postgres pg_isready -U postgres

# PostGIS
docker exec dubaomatrung-postgis pg_isready -U postgres
docker exec dubaomatrung-admin-postgis pg_isready -U postgres

# MongoDB
docker exec dubaomatrung-mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec dubaomatrung-redis redis-cli PING
```

## Xử Lý Sự Cố

### 1. Database Import Chậm

Database admin_db (1.9GB) có thể mất 5-10 phút để import:

```powershell
# Xem log import
.\deploy.ps1 -Logs -Service admin-postgis

# Kiểm tra tiến trình
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dt"
```

### 2. Service Không Khởi Động

```powershell
# Xem logs để tìm lỗi
.\deploy.ps1 -Logs -Service "service-name"

# Restart service
.\deploy.ps1 -Restart -Service "service-name"

# Rebuild nếu cần
.\deploy.ps1 -Rebuild -Service "service-name"
```

### 3. Port Bị Chiếm Dụng

```powershell
# Kiểm tra port đang dùng
netstat -ano | findstr ":3000"

# Kill process (thay PID)
taskkill /PID 1234 /F
```

### 4. Docker Out of Memory

Tăng memory cho Docker Desktop:
1. Docker Desktop → Settings → Resources
2. Tăng Memory lên 8GB hoặc hơn
3. Apply & Restart

### 5. Database Connection Failed

```powershell
# Kiểm tra containers có chạy không
docker-compose ps

# Kiểm tra network
docker network ls
docker network inspect dubaomatrung-network

# Restart database containers
docker-compose restart postgres postgis admin-postgis
```

## Cập Nhật Hệ Thống

### Cập Nhật Code

```powershell
# Pull code mới từ git
git pull origin main

# Rebuild và deploy
.\deploy.ps1 -Rebuild
```

### Cập Nhật Database Schema

```powershell
# Backup database trước
.\deploy.ps1 -ExportDB

# Chạy migrations (nếu có)
docker exec dubaomatrung-auth npx prisma migrate deploy

# Hoặc import SQL file mới
docker exec -i dubaomatrung-postgres psql -U postgres -d auth_db < new-migration.sql
```

## Bảo Mật

### Checklist Bảo Mật Production

- [ ] Đổi tất cả passwords mặc định
- [ ] Tạo JWT secret mạnh
- [ ] Cấu hình firewall chỉ cho phép ports cần thiết
- [ ] Enable HTTPS (sử dụng reverse proxy như nginx)
- [ ] Backup database định kỳ
- [ ] Giới hạn truy cập vào Docker API
- [ ] Cập nhật Docker images thường xuyên
- [ ] Monitor logs để phát hiện lỗi sớm

## Hỗ Trợ

Nếu gặp vấn đề:

1. Xem logs: `.\deploy.ps1 -Logs`
2. Kiểm tra tài liệu trong thư mục `docs/`
3. Liên hệ team phát triển

## Tham Khảo

- Docker Documentation: https://docs.docker.com/
- PostgreSQL 17 Docs: https://www.postgresql.org/docs/17/
- PostGIS Documentation: https://postgis.net/documentation/
- MongoDB Documentation: https://docs.mongodb.com/
