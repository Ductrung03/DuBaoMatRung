# Thay Đổi Cấu Hình Deploy

## Vấn đề đã sửa

Trước đây, các file SQL export tạo database riêng biệt (`auth_db`, `gis_db`, `admin_db`) nhưng cấu hình Docker chỉ tạo 1 database mặc định cho mỗi container, dẫn đến việc import dữ liệu không thành công.

## Các thay đổi đã thực hiện

### 1. Cấu hình Database Containers

**PostgreSQL (port 5432):**
- Xóa `POSTGRES_DB: auth_db` để không tạo database mặc định
- File init: `docker-init/postgres/01-auth-db.sql` sẽ tự tạo database `auth_db`

**PostGIS (port 5433):**
- Xóa `POSTGRES_DB: gis_db` để không tạo database mặc định  
- File init: `docker-init/postgis/01-gis-db.sql` sẽ tự tạo database `gis_db`

**Admin PostGIS (port 5434) - MỚI:**
- Container riêng cho admin database
- File init: `docker-init/admin-postgis/01-admin-db.sql` sẽ tự tạo database `admin_db`

### 2. Cấu hình Services

**auth-service:** 
- `DB_NAME=auth_db` (kết nối postgres:5432)

**user-service:** 
- `DB_NAME=auth_db` (kết nối postgres:5432)

**gis-service:** 
- `DB_NAME=gis_db` (kết nối postgis:5433)

**admin-service:** 
- `DB_NAME=admin_db` (kết nối admin-postgis:5434)

**report-service:** 
- `DB_NAME=auth_db` (kết nối postgres:5432)

**search-service:** 
- `DB_NAME=auth_db` (kết nối postgres:5432)

### 3. Volumes

Thêm volume mới:
- `admin_postgis_data` cho admin database

### 4. Deploy Script

Cập nhật `deploy-docker.ps1`:
- Khởi động thêm `admin-postgis` container
- Kiểm tra health của 3 PostgreSQL containers
- Tạo PostGIS extension cho cả `gis_db` và `admin_db`

### 5. File Structure

```
docker-init/
├── postgres/
│   └── 01-auth-db.sql      # Tạo auth_db
├── postgis/
│   └── 01-gis-db.sql       # Tạo gis_db
└── admin-postgis/          # MỚI
    └── 01-admin-db.sql     # Tạo admin_db
```

## Ports

- PostgreSQL (auth): 5432
- PostGIS (gis): 5433  
- PostGIS (admin): 5434
- MongoDB: 27017
- Redis: 6379

## Cách deploy trên Windows Server

1. Copy toàn bộ project vào `C:\DuBaoMatRung`
2. Chạy: `.\deploy-docker.ps1 -FirstTime`
3. Các database sẽ tự động import từ file SQL

## Kiểm tra

Sau khi deploy, kiểm tra:
```powershell
docker-compose ps
docker-compose logs postgres
docker-compose logs postgis  
docker-compose logs admin-postgis
```
