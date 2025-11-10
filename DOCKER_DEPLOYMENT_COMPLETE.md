# ✅ Docker Deployment Solution - PostgreSQL 17 Edition

## Tổng Quan

Đã hoàn thành việc chuyển đổi hệ thống Dự Báo Mất Rừng sang Docker deployment với PostgreSQL 17 + PostGIS 17.

## Những Gì Đã Làm

### 1. ✅ Cập Nhật Docker Compose

**File: `docker-compose.yml`**

- ⬆️ Nâng cấp từ PostgreSQL 15 → **PostgreSQL 17**
- ⬆️ Nâng cấp từ PostGIS 15 → **PostGIS 17 (3.5)**
- ⬆️ MongoDB 7.0
- ⬆️ Redis 7
- ✨ Thêm auto-import databases on first start
- 🔧 Tối ưu resource limits cho admin-postgis (4GB memory)
- 🔧 Thêm healthchecks cho tất cả services

### 2. ✅ Tạo Deployment Script

**File: `deploy.ps1`** (Windows PowerShell)

Chức năng:
- `-FirstTime`: Deploy lần đầu với auto-import
- `-Stop`: Dừng tất cả services
- `-Restart`: Restart services (không rebuild)
- `-Rebuild`: Rebuild và restart
- `-Logs`: Xem logs
- `-Service <name>`: Target service cụ thể
- `-ExportDB`: Export tất cả databases
- `-CleanAll`: Xóa tất cả (containers, volumes, images)
- `-Help`: Hiển thị hướng dẫn

### 3. ✅ Tạo Export Script

**File: `export-databases.sh`** (Linux/Mac Bash)

Tự động export:
- PostgreSQL: auth_db
- PostGIS: gis_db
- PostGIS: admin_db (có thể mất 5-10 phút)
- MongoDB: logging_db

### 4. ✅ Viết Tài Liệu Đầy Đủ

**File: `DEPLOYMENT_GUIDE.md`**

Hướng dẫn chi tiết bằng tiếng Việt:
- Yêu cầu hệ thống
- Hướng dẫn cài đặt từng bước
- Quản lý services
- Backup & restore
- Truy cập database trực tiếp
- Cấu hình production
- Monitoring
- Troubleshooting
- Bảo mật

**File: `QUICKSTART_DOCKER.md`**

Hướng dẫn nhanh:
- Quick start commands
- Architecture diagram
- Essential troubleshooting

**File: `docker-init/README.md`**

Hướng dẫn về database initialization:
- Cấu trúc files
- Import/export
- Troubleshooting
- Security

### 5. ✅ Dọn Dẹp Files Cũ

Đã xóa **30+ files PS1 cũ** không cần thiết:

```
❌ update.ps1
❌ fix-env.ps1
❌ fix-auth-service.ps1
❌ debug-auth.ps1
❌ fix-database-url.ps1
❌ fix-database-schema.ps1
❌ fix-all-services.ps1
❌ check-remaining-services.ps1
❌ fix-redis-issue.ps1
❌ fix-docker-cache.ps1
❌ final-check.ps1
❌ check-500-errors.ps1
❌ fix-mapserver-and-admin.ps1
❌ rebuild-mapserver-admin.ps1
❌ test-services-now.ps1
❌ check-and-import-databases.ps1
❌ import-admin-db.ps1
❌ create-materialized-views.ps1
❌ fix-all-final.ps1
❌ check-mapserver-complete.ps1
❌ fix-mapserver-final.ps1
❌ check-postgis-data.ps1
❌ import-sample-data.ps1
❌ import-admin-data.ps1
❌ deploy-windows.ps1
❌ export-admin-db-for-pg15.ps1
❌ import-admin-db-full.ps1
❌ import-admin-db-direct.ps1
... và nhiều files khác
```

**Chỉ giữ lại:**
- ✅ `deploy.ps1` - Script deployment chính
- ✅ `export-databases.sh` - Export databases

## Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (5173)                        │
│                     React + Vite Frontend                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Gateway (3000)                          │
│                      API Gateway                             │
└─────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┘
      │      │      │      │      │      │      │
      ▼      ▼      ▼      ▼      ▼      ▼      ▼
   ┌─────┐┌────┐┌────┐┌─────┐┌─────┐┌──────┐┌────────┐
   │Auth ││User││GIS ││Report││Admin││Search││MapServer│
   │3001 ││3002││3003││3004 ││3005 ││3006  ││3007    │
   └──┬──┘└──┬─┘└─┬──┘└──┬──┘└──┬──┘└──┬───┘└───┬────┘
      │      │    │      │      │      │        │
      │      │    │      │      │      │        │
      ▼      ▼    ▼      ▼      ▼      ▼        ▼
   ┌──────────┐  │   ┌──────────┐  ┌─────────────────┐
   │PostgreSQL│  │   │PostGIS   │  │    MongoDB      │
   │    17    │  │   │    17    │  │      7.0        │
   │  5432    │  │   │  5434    │  │    27017        │
   │ auth_db  │  │   │ admin_db │  │  logging_db     │
   └──────────┘  │   └──────────┘  └─────────────────┘
                 │   ┌──────────┐
                 └───┤PostGIS   │
                     │    17    │◄──┐
                     │  5433    │   │
                     │  gis_db  │   │ ┌─────────┐
                     └──────────┘   └─┤ Redis 7 │
                                      │  6379   │
                                      └─────────┘
```

## Databases

### 1. PostgreSQL 17 (port 5432)
**Database: auth_db (~31KB)**

Tables:
- `User` - Người dùng hệ thống
- `Role` - Vai trò/nhóm quyền
- `Permission` - Quyền hạn
- `UserRole` - Mapping user-role
- `RolePermission` - Mapping role-permission
- `DataScope` - Phạm vi dữ liệu (quốc gia/tỉnh/huyện/xã)
- `RoleDataScope` - Mapping role-datascope

### 2. PostGIS 17 (port 5433)
**Database: gis_db (~12MB)**

Tables:
- GIS layers
- Shapefile data
- Spatial data

Extensions:
- postgis
- postgis_topology
- dblink
- postgres_fdw
- uuid-ossp

### 3. PostGIS 17 (port 5434)
**Database: admin_db (~1.9GB)** ⚠️ Large!

Tables:
- ~100+ tables cho dữ liệu quản lý
- Materialized views: `mv_huyen`, `mv_churung`, etc.
- Functions: `get_all_churung()`, `get_all_khoanh()`, etc.

Extensions:
- postgis
- unaccent

### 4. MongoDB 7 (port 27017)
**Database: logging_db**

Collections:
- `logs` - System logs
- `audit_trail` - Audit logs
- `user_activities` - User activity tracking

### 5. Redis 7 (port 6379)
**Purpose: GIS Cache**
- Maxmemory: 256MB
- Policy: allkeys-lru

## Services

| Port | Service | Purpose |
|------|---------|---------|
| 5173 | Client | React frontend |
| 3000 | Gateway | API Gateway |
| 3001 | Auth Service | Authentication & Authorization |
| 3002 | User Service | User management |
| 3003 | GIS Service | GIS operations + Redis cache |
| 3004 | Report Service | Reporting |
| 3005 | Admin Service | Admin operations |
| 3006 | Search Service | Search functionality |
| 3007 | MapServer | MapServer integration |

## Cách Sử Dụng

### Deployment Lần Đầu

```powershell
# 1. Đảm bảo có database files trong docker-init/
ls docker-init/postgres/01-auth-db.sql
ls docker-init/postgis/01-gis-db.sql
ls docker-init/admin-postgis/01-admin-db.sql

# 2. Deploy lần đầu (tự động import databases)
.\deploy.ps1 -FirstTime

# Thời gian: 10-20 phút
```

### Quản Lý Services

```powershell
# Xem trạng thái
docker-compose ps

# Restart all
.\deploy.ps1 -Restart

# Restart service cụ thể
.\deploy.ps1 -Restart -Service "auth-service"

# Rebuild (khi thay đổi code)
.\deploy.ps1 -Rebuild

# Stop all
.\deploy.ps1 -Stop

# Xem logs
.\deploy.ps1 -Logs
.\deploy.ps1 -Logs -Service "gateway"
```

### Backup Database

```powershell
# Export tất cả databases
.\deploy.ps1 -ExportDB

# Files sẽ được lưu trong docker-init/
```

### Restore Database

```powershell
# 1. Stop services
.\deploy.ps1 -Stop

# 2. Xóa volumes
docker-compose down -v

# 3. Đặt file SQL mới vào docker-init/

# 4. Deploy lại
.\deploy.ps1 -FirstTime
```

## Truy Cập Database

### PostgreSQL (auth_db)

```bash
# Từ container
docker exec -it dubaomatrung-postgres psql -U postgres -d auth_db

# Từ host (nếu có psql)
psql -h localhost -p 5432 -U postgres -d auth_db
# Password: postgres123 (hoặc từ .env)
```

### PostGIS (gis_db)

```bash
docker exec -it dubaomatrung-postgis psql -U postgres -d gis_db
# hoặc
psql -h localhost -p 5433 -U postgres -d gis_db
```

### PostGIS (admin_db)

```bash
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db
# hoặc
psql -h localhost -p 5434 -U postgres -d admin_db
```

### MongoDB

```bash
docker exec -it dubaomatrung-mongodb mongosh
# hoặc
mongosh "mongodb://localhost:27017/logging_db"
```

### Redis

```bash
docker exec -it dubaomatrung-redis redis-cli
```

## Cấu Hình Production

### 1. Đổi Passwords

Sửa file `.env`:

```env
DB_PASSWORD=YourStrongPassword123!
JWT_SECRET=your-super-secret-key-here
```

### 2. Tăng Resources

Sửa `docker-compose.yml` nếu cần:

```yaml
admin-postgis:
  deploy:
    resources:
      limits:
        memory: 8G  # Tăng từ 4G
```

### 3. Backup Tự Động

Tạo Windows Task Scheduler:

```powershell
# Chạy mỗi ngày lúc 2:00 AM
schtasks /create /tn "DuBaoMatRung-Backup" /tr "C:\Projects\DuBaoMatRung\deploy.ps1 -ExportDB" /sc daily /st 02:00
```

## Lưu Ý Quan Trọng

1. **Database admin_db rất lớn (1.9GB)**
   - Import có thể mất 5-10 phút
   - Cần tối thiểu 4GB RAM cho container
   - Monitor logs: `.\deploy.ps1 -Logs -Service admin-postgis`

2. **PostgreSQL 17**
   - Có thể có breaking changes từ PostgreSQL 15
   - Test kỹ trước khi deploy production
   - Backup trước khi nâng cấp

3. **First Time Setup**
   - Đảm bảo có file `.env` với passwords
   - Đảm bảo có database dumps trong `docker-init/`
   - Đảm bảo Docker Desktop đang chạy

4. **Production Deployment**
   - Đổi tất cả passwords mặc định
   - Enable HTTPS (sử dụng reverse proxy)
   - Cấu hình firewall
   - Setup backup tự động
   - Monitor logs thường xuyên

## Troubleshooting

### Database Import Chậm

```powershell
# Xem log import
.\deploy.ps1 -Logs -Service admin-postgis

# Kiểm tra tiến trình
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dt"
```

### Service Không Khởi Động

```powershell
# Xem logs
.\deploy.ps1 -Logs -Service "service-name"

# Rebuild
.\deploy.ps1 -Rebuild -Service "service-name"
```

### Port Bị Chiếm

```powershell
# Kiểm tra port
netstat -ano | findstr ":3000"

# Kill process
taskkill /PID [PID] /F
```

### Out of Memory

Tăng memory trong Docker Desktop:
- Settings → Resources → Memory → 8GB+
- Apply & Restart

## Files Structure

```
DuBaoMatRung/
├── docker-compose.yml          ← Updated với PostgreSQL 17
├── deploy.ps1                  ← Windows deployment script
├── export-databases.sh         ← Linux/Mac export script
├── .env                        ← Environment variables
│
├── DEPLOYMENT_GUIDE.md         ← Hướng dẫn chi tiết
├── QUICKSTART_DOCKER.md        ← Hướng dẫn nhanh
├── DOCKER_DEPLOYMENT_COMPLETE.md ← File này
│
├── docker-init/                ← Database initialization
│   ├── README.md
│   ├── postgres/
│   │   └── 01-auth-db.sql
│   ├── postgis/
│   │   └── 01-gis-db.sql
│   ├── admin-postgis/
│   │   └── 01-admin-db.sql
│   └── mongodb/
│       └── logging_db.archive
│
├── microservices/              ← Backend services
│   ├── gateway/
│   └── services/
│       ├── auth-service/
│       ├── user-service/
│       ├── gis-service/
│       ├── report-service/
│       ├── admin-service/
│       ├── search-service/
│       └── mapserver-service/
│
└── client/                     ← Frontend React app
```

## Checklist Deploy Production

- [ ] Cài Docker Desktop
- [ ] Copy project vào server
- [ ] Chuẩn bị database files trong docker-init/
- [ ] Tạo `.env` với passwords mạnh
- [ ] Đổi JWT_SECRET
- [ ] Cấu hình domain trong docker-compose.yml
- [ ] Chạy `.\deploy.ps1 -FirstTime`
- [ ] Test tất cả services
- [ ] Setup backup tự động
- [ ] Cấu hình firewall
- [ ] Enable HTTPS
- [ ] Monitor logs

## Resources

- [PostgreSQL 17 Documentation](https://www.postgresql.org/docs/17/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)

## Hỗ Trợ

Nếu gặp vấn đề:

1. Xem logs: `.\deploy.ps1 -Logs`
2. Đọc `DEPLOYMENT_GUIDE.md` phần Troubleshooting
3. Kiểm tra Docker Desktop có đang chạy không
4. Đảm bảo có đủ RAM (8GB+) và disk space (50GB+)

---

**Tác giả**: Claude + LuckyBoiz Team
**Ngày**: 2025-11-10
**Phiên bản**: Docker PostgreSQL 17 Edition
**Status**: ✅ HOÀN THÀNH
