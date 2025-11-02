# 🚀 Hướng Dẫn Deployment - Du Bao Mat Rung

## 📋 Tổng quan

Hệ thống được deploy hoàn toàn bằng **Docker** trên **Windows Server**.

### Đặc điểm
- ✅ **Không cần Git Clone** - Code đã được tải sẵn trên server
- ✅ **Auto Import Database** - Database tự động import từ `docker-init/` lần đầu chạy
- ✅ **One-Command Deploy** - Chỉ cần 1 lệnh để deploy
- ✅ **Fast Update** - Update code cực nhanh với script thông minh

---

## 🎯 Yêu cầu hệ thống

### Windows Server
- Windows 10/11 hoặc Windows Server 2019+
- RAM: 8GB+ (khuyến nghị 16GB do admin database lớn)
- Disk: 20GB+ free space
- Docker Desktop for Windows

### Cài đặt Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Install và restart Windows
3. Mở PowerShell và test: `docker --version`

---

## 📁 Cấu trúc thư mục

```
C:\DuBaoMatRung\                    # Root folder trên server
├── docker-init/                    # Database dumps (QUAN TRỌNG!)
│   ├── postgres/                   # Auth database (~31KB)
│   │   └── 01-auth-db.sql
│   ├── postgis/                    # GIS database (~12MB)
│   │   └── 01-gis-db.sql
│   └── admin-postgis/              # Admin database (~2.5GB)
│       ├── 01-admin-db.sql
│       └── 01-gis-db.sql
├── client/                         # React frontend
├── microservices/                  # Backend services
├── docker-compose.yml              # Docker configuration
├── deploy.ps1                      # Main deployment script
├── update.ps1                      # Quick update script
└── .env                            # Environment variables
```

---

## 🏁 Deployment Lần Đầu Tiên

### 1. Chuẩn bị

Đảm bảo code và database dumps đã có trên server:
```powershell
# Mở PowerShell as Administrator
cd C:\DuBaoMatRung

# Kiểm tra database dumps
dir docker-init\postgres\
dir docker-init\postgis\
dir docker-init\admin-postgis\
```

### 2. Tạo file .env

Tạo file `.env` trong root folder:
```powershell
notepad .env
```

Nội dung `.env`:
```env
# Database Password
DB_PASSWORD=your_secure_password_here

# JWT Secret (generate random string)
JWT_SECRET=your_jwt_secret_key_min_32_characters

# API URL (thay bằng IP server của bạn)
VITE_API_URL=http://103.56.161.239:3000
```

### 3. Deploy

```powershell
# Chạy deployment lần đầu (10-20 phút)
.\deploy.ps1 -FirstTime
```

Script sẽ tự động:
- ✅ Pull Docker images
- ✅ Build tất cả services
- ✅ Start containers
- ✅ Auto-import database từ `docker-init/`

### 4. Kiểm tra

```powershell
# Xem trạng thái containers
docker-compose ps

# Xem logs
.\deploy.ps1 -Logs
```

Truy cập:
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

---

## 🔄 Update Code (Sau khi sửa code)

### Phương pháp 1: Auto-detect Changes (Khuyến nghị)

```powershell
# Script tự động phát hiện service nào thay đổi và rebuild
.\update.ps1 -AutoDetect
```

### Phương pháp 2: Update Service Cụ Thể

```powershell
# Update 1 service
.\update.ps1 -Services client

# Update nhiều services
.\update.ps1 -Services client,auth-service,gateway
```

### Phương pháp 3: Interactive Mode

```powershell
# Chọn services từ menu
.\update.ps1
```

### Phương pháp 4: Update Tất Cả

```powershell
# Rebuild toàn bộ (lâu hơn)
.\update.ps1 -All

# Hoặc dùng deploy.ps1
.\deploy.ps1 -Rebuild
```

---

## 🛠️ Các Lệnh Thường Dùng

### Deploy & Management

```powershell
# Deploy lần đầu
.\deploy.ps1 -FirstTime

# Start services (nếu đã build rồi)
.\deploy.ps1

# Stop tất cả services
.\deploy.ps1 -Stop

# Restart services (không rebuild)
.\deploy.ps1 -Restart

# Rebuild tất cả
.\deploy.ps1 -Rebuild

# Rebuild 1 service cụ thể
.\deploy.ps1 -Rebuild -Service client
```

### Logs

```powershell
# Xem logs tất cả services
.\deploy.ps1 -Logs

# Xem logs 1 service
.\deploy.ps1 -Logs -Service auth-service

# Logs 100 dòng cuối
docker-compose logs --tail=100 client

# Follow logs (real-time)
docker-compose logs -f gateway
```

### Status & Debug

```powershell
# Xem status containers
docker-compose ps

# Xem resource usage
docker stats

# Kiểm tra health
docker inspect dubaomatrung-postgres | findstr Health

# Vào bên trong container
docker exec -it dubaomatrung-client sh
```

### Database

```powershell
# Kết nối PostgreSQL
docker exec -it dubaomatrung-postgres psql -U postgres auth_db

# Kết nối PostGIS
docker exec -it dubaomatrung-postgis psql -U postgres gis_db

# Export database
docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > backup.sql

# Import database manual
docker exec -i dubaomatrung-postgres psql -U postgres auth_db < backup.sql
```

---

## 🔧 Troubleshooting

### 1. Container không start

```powershell
# Xem logs lỗi
.\deploy.ps1 -Logs -Service <service-name>

# Restart service
.\deploy.ps1 -Restart -Service <service-name>

# Rebuild service
.\deploy.ps1 -Rebuild -Service <service-name>
```

### 2. Port bị chiếm

```powershell
# Kiểm tra port đang bị dùng
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Kill process theo PID
taskkill /F /PID <PID>
```

### 3. Database lỗi / Muốn reset

```powershell
# CẢNH BÁO: Lệnh này XÓA TẤT CẢ DỮ LIỆU!
docker-compose down -v

# Import lại từ đầu
.\deploy.ps1 -FirstTime
```

### 4. Docker build chậm / Cache lỗi

```powershell
# Rebuild without cache
docker-compose build --no-cache

# Clean Docker cache
docker system prune -a
```

### 5. Service crashed / unhealthy

```powershell
# Xem logs chi tiết
.\deploy.ps1 -Logs -Service <service-name>

# Check environment variables
docker exec dubaomatrung-<service> env

# Restart service
.\deploy.ps1 -Restart -Service <service-name>
```

### 6. Database không import tự động

```powershell
# Check xem database đã tồn tại chưa
docker exec -it dubaomatrung-postgres psql -U postgres auth_db -c "\dt"

# Nếu đã có data, PostgreSQL sẽ skip auto-import
# Phải xóa volume để import lại:
docker-compose down -v
.\deploy.ps1 -FirstTime
```

### 7. Out of memory (OOM)

Admin database rất lớn (2.5GB), có thể gây OOM khi import:

```powershell
# Tăng Docker memory limit (Docker Desktop > Settings > Resources)
# Khuyến nghị: 8GB+

# Hoặc import database manual sau:
docker exec -i dubaomatrung-admin-postgis psql -U postgres admin_db < docker-init/admin-postgis/01-admin-db.sql
```

---

## 🔐 Security Best Practices

### Production Server

1. **Đổi password mặc định**
   ```env
   DB_PASSWORD=use_strong_password_here
   JWT_SECRET=generate_random_32_chars_minimum
   ```

2. **Firewall rules**
   ```powershell
   # Chỉ mở port cần thiết
   # Frontend: 5173
   # Gateway: 3000
   # Block các port database từ internet
   ```

3. **Regular backups**
   ```powershell
   # Tạo script backup tự động
   docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > backup-$(Get-Date -Format 'yyyy-MM-dd').sql
   ```

4. **Update Docker images định kỳ**
   ```powershell
   docker-compose pull
   .\deploy.ps1 -Rebuild
   ```

---

## 📊 Service Ports

| Service | Port | Internal |
|---------|------|----------|
| Client (Frontend) | 5173 | ✅ |
| Gateway | 3000 | ✅ |
| Auth Service | 3001 | ❌ |
| User Service | 3002 | ❌ |
| GIS Service | 3003 | ❌ |
| Report Service | 3004 | ❌ |
| Admin Service | 3005 | ❌ |
| Search Service | 3006 | ❌ |
| MapServer | 3007 | ❌ |
| PostgreSQL | 5432 | ❌ |
| PostGIS | 5433 | ❌ |
| Admin PostGIS | 5434 | ❌ |
| MongoDB | 27017 | ❌ |
| Redis | 6379 | ❌ |

**Internal** = Nên expose ra internet
Chỉ mở port **5173** (frontend) và **3000** (API gateway) ra ngoài.

---

## 🎓 Workflow Khuyến Nghị

### Develop trên local machine
```powershell
# Clone code về máy local
git clone ...

# Sửa code ở local
# Test với npm run dev

# Commit và push
git commit -m "Fix bug ABC"
git push origin main
```

### Deploy lên server
```powershell
# SSH hoặc Remote Desktop vào server
cd C:\DuBaoMatRung

# Pull code mới
git pull origin main

# Update services đã thay đổi
.\update.ps1 -AutoDetect

# Hoặc update thủ công
.\update.ps1 -Services client,auth-service

# Check logs
.\deploy.ps1 -Logs
```

### Hotfix nhanh
```powershell
# Sửa trực tiếp trên server (không khuyến khích nhưng đôi khi cần)
notepad microservices\services\auth-service\src\controllers\auth.js

# Update service
.\update.ps1 -Services auth-service

# Commit để sync với git
git add .
git commit -m "Hotfix: ..."
git push
```

---

## 📚 Tài liệu tham khảo

- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL Docker**: https://hub.docker.com/_/postgres
- **PostGIS Docker**: https://hub.docker.com/r/postgis/postgis
- **Nginx Docker**: https://hub.docker.com/_/nginx

---

## 💡 Tips & Tricks

### 1. Xem logs nhiều services cùng lúc
```powershell
# Mở nhiều PowerShell windows và chạy
.\deploy.ps1 -Logs -Service auth-service   # Window 1
.\deploy.ps1 -Logs -Service gateway        # Window 2
.\deploy.ps1 -Logs -Service client         # Window 3
```

### 2. Quick restart 1 service
```powershell
docker-compose restart auth-service
```

### 3. Update chỉ frontend (cực nhanh)
```powershell
.\update.ps1 -Services client
# Chỉ mất ~1 phút
```

### 4. Monitor resource usage
```powershell
# Realtime CPU, Memory usage
docker stats
```

### 5. Clean up disk space
```powershell
# Xóa images và containers không dùng
docker system prune -a

# Xóa volumes không dùng
docker volume prune
```

---

## 🆘 Support

Nếu gặp vấn đề:

1. **Check logs**: `.\deploy.ps1 -Logs`
2. **Check status**: `docker-compose ps`
3. **Restart service**: `.\deploy.ps1 -Restart`
4. **Rebuild service**: `.\deploy.ps1 -Rebuild`
5. **Full reset**: `docker-compose down -v && .\deploy.ps1 -FirstTime`

---

**Version**: 2.0
**Last Updated**: 2025-01-02
**Maintainer**: LuckyBoiz
