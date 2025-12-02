# Docker Deployment Guide - Windows Server

Hướng dẫn triển khai DuBaoMatRung lên Windows Server sử dụng Docker.

## 📋 Yêu Cầu

### Windows Server
- **OS**: Windows Server 2019/2022 hoặc Windows 10/11 Pro
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Disk**: 50GB trống
- **Network**: Port 80, 3000-3007, 5433, 6379

### Phần Mềm Cần Cài
- **Docker Desktop for Windows** (bao gồm Docker Compose)
  - Download: https://www.docker.com/products/docker-desktop

## 🚀 Quy Trình Deploy

### Bước 1: Chuẩn Bị Trên Máy Development (Linux)

```bash
# 1. Export dữ liệu hiện tại
cd /home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung
./docker/export-current-data.sh

# 2. Đóng gói toàn bộ project
cd ..
tar -czf DuBaoMatRung-deploy.tar.gz \
  --exclude=DuBaoMatRung/node_modules \
  --exclude=DuBaoMatRung/*/node_modules \
  --exclude=DuBaoMatRung/*/*/node_modules \
  --exclude=DuBaoMatRung/microservices/services/*/logs \
  DuBaoMatRung/

# 3. File DuBaoMatRung-deploy.tar.gz đã sẵn sàng để copy sang Windows Server
```

**Kết quả**: File `DuBaoMatRung-deploy.tar.gz` (~200-500MB) và folder `docker/initial-data/` chứa 3 file SQL.

### Bước 2: Transfer Sang Windows Server

**Cách 1: SCP/SFTP** (nếu có SSH trên Windows)
```bash
scp DuBaoMatRung-deploy.tar.gz administrator@103.56.160.66:C:/Deploy/
```

**Cách 2: Remote Desktop**
- Kết nối RDP tới `103.56.160.66`
- Copy file qua Clipboard hoặc Shared Folder

**Cách 3: Cloud Storage**
- Upload lên Google Drive/OneDrive
- Download trên Windows Server

### Bước 3: Giải Nén Trên Windows Server

```powershell
# Mở PowerShell as Administrator
cd C:\Deploy

# Giải nén (cần 7-Zip hoặc WinRAR)
tar -xzf DuBaoMatRung-deploy.tar.gz

# Hoặc dùng 7-Zip GUI
```

### Bước 4: Cấu Hình Environment

```powershell
cd C:\Deploy\DuBaoMatRung

# Copy template .env
Copy-Item env.docker.example .env

# Mở .env bằng Notepad và chỉnh sửa
notepad .env
```

**Cập nhật trong `.env`:**
```bash
# Database Password
DB_PASSWORD=MatKhauManhMe123!@#

# JWT Secrets (generate random)
JWT_SECRET=random_string_32_characters_here
REFRESH_TOKEN_SECRET=another_random_string_32_chars

# Server IP
SERVER_IP=103.56.160.66
```

**Tạo JWT Secret random:**
```powershell
# Trên PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Bước 5: Deploy One-Command

```powershell
# Deploy lần đầu (full build + import data)
.\deploy-windows.ps1

# Hoặc fresh install (xóa toàn bộ data cũ)
.\deploy-windows.ps1 -Fresh

# Restart nhanh (không rebuild)
.\deploy-windows.ps1 -SkipBuild
```

**Script sẽ tự động:**
1. ✅ Kiểm tra Docker installation
2. ✅ Build tất cả Docker images
3. ✅ Start PostgreSQL 17 + Redis
4. ✅ Import initial data (nếu có)
5. ✅ Start tất cả 9 services
6. ✅ Health check toàn bộ hệ thống

### Bước 6: Verify Deployment

**Kiểm tra services:**
```powershell
# Xem status tất cả containers
docker compose ps

# Xem logs real-time
docker compose logs -f

# Kiểm tra specific service
docker compose logs -f gateway
docker compose logs -f auth-service
```

**Test API:**
```powershell
# Health check
curl http://localhost:3000/health

# Test from browser
Start-Process http://103.56.160.66
```

## 🌐 Truy Cập Application

- **Frontend**: http://103.56.160.66
- **API Gateway**: http://103.56.160.66:3000
- **Swagger Docs**: http://103.56.160.66:3000/api-docs

**Default Admin Account:**
- Username: `admin`
- Password: (xem trong file seed data hoặc logs)

## 🔧 Quản Lý Docker

### Xem Logs
```powershell
# Tất cả services
docker compose logs -f

# Specific service
docker compose logs -f gateway
docker compose logs -f auth-service

# Last 100 lines
docker compose logs --tail=100
```

### Start/Stop Services
```powershell
# Stop tất cả
docker compose down

# Start lại
docker compose up -d

# Restart specific service
docker compose restart gateway

# Restart tất cả
docker compose restart
```

### Backup Database
```powershell
# Backup tất cả databases
docker compose exec postgres /bin/sh -c "mkdir -p /backups && pg_dump -U postgres auth_db > /backups/auth_db.sql"
docker compose exec postgres /bin/sh -c "pg_dump -U postgres gis_db > /backups/gis_db.sql"
docker compose exec postgres /bin/sh -c "pg_dump -U postgres admin_db > /backups/admin_db.sql"

# Copy backup ra host
docker cp dubaomatrung-postgres:/backups ./backups
```

### Database Management
```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d auth_db

# List databases
docker compose exec postgres psql -U postgres -c "\l"

# View tables
docker compose exec postgres psql -U postgres -d auth_db -c "\dt"
```

### Rebuild Service
```powershell
# Rebuild specific service
docker compose build gateway
docker compose up -d gateway

# Rebuild tất cả
docker compose build
docker compose up -d
```

### Clean Up
```powershell
# Remove containers only
docker compose down

# Remove containers + volumes (xóa data!)
docker compose down -v

# Remove unused images
docker image prune -a

# Clean all Docker data
docker system prune -a --volumes
```

## 📊 Monitoring

### Check Resource Usage
```powershell
# Container resource usage
docker stats

# Disk usage
docker system df

# Service status
docker compose ps
```

### View Container Details
```powershell
# Container info
docker inspect dubaomatrung-gateway

# Health status
docker inspect --format='{{.State.Health.Status}}' dubaomatrung-gateway
```

## 🔒 Security Checklist

- [ ] Đổi `DB_PASSWORD` trong `.env`
- [ ] Đổi `JWT_SECRET` và `REFRESH_TOKEN_SECRET`
- [ ] Đổi password admin user sau lần đăng nhập đầu
- [ ] Cấu hình Windows Firewall cho ports cần thiết
- [ ] Cài đặt SSL/TLS certificate (nếu production)
- [ ] Enable Docker logging limits
- [ ] Regular backup schedule

## 🐛 Troubleshooting

### Service không start
```powershell
# Xem logs chi tiết
docker compose logs <service-name>

# Restart service
docker compose restart <service-name>

# Rebuild và restart
docker compose up -d --build <service-name>
```

### PostgreSQL connection failed
```powershell
# Check PostgreSQL health
docker compose exec postgres pg_isready -U postgres

# View PostgreSQL logs
docker compose logs postgres

# Connect manually
docker compose exec postgres psql -U postgres
```

### Port conflict
```powershell
# Check ports in use
netstat -ano | findstr "3000"
netstat -ano | findstr "5433"

# Kill process using port
taskkill /PID <PID> /F

# Change ports in docker-compose.yml
```

### Out of disk space
```powershell
# Clean unused data
docker system prune -a

# Remove old images
docker image prune -a

# Check disk usage
docker system df
```

### Container keeps restarting
```powershell
# Check logs for errors
docker compose logs <service-name>

# Check resource limits
docker stats

# Check service dependencies
docker compose ps
```

## 📦 Update Application

### Update Code Only (No Data Loss)
```powershell
# 1. Pull latest code hoặc copy files mới
cd C:\Deploy\DuBaoMatRung

# 2. Stop services
docker compose down

# 3. Rebuild images
docker compose build

# 4. Start services
docker compose up -d
```

### Update with Database Migration
```powershell
# 1. Backup database trước
.\docker\backup-databases.sh

# 2. Update code
cd C:\Deploy\DuBaoMatRung

# 3. Stop và rebuild
docker compose down
docker compose build

# 4. Start (migrations run automatically)
docker compose up -d

# 5. Check migration logs
docker compose logs auth-service | Select-String "migration"
```

## 🔄 Rollback

```powershell
# Restore from backup
docker compose down
.\docker\restore-databases.sh .\backups\<backup-folder>
docker compose up -d
```

## 📞 Support

Nếu gặp vấn đề, thu thập thông tin sau:

```powershell
# 1. Service status
docker compose ps > status.txt

# 2. Logs
docker compose logs > logs.txt

# 3. System info
docker version > docker-version.txt
systeminfo > system-info.txt
```

## 📚 Tài Liệu Thêm

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation

---

**LuckyBoiz** - DuBaoMatRung Project
