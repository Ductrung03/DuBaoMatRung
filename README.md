# DuBaoMatRung — Hệ Thống Giám Sát & Dự Báo Mất Rừng

Hệ thống giám sát và dự báo mất rừng theo kiến trúc microservices, hỗ trợ phân tích ảnh viễn thám GIS, quản lý dữ liệu không gian, và báo cáo mất rừng tỉnh Sơn La.

---

## Mục Lục

1. [Yêu Cầu Hệ Thống](#1-yêu-cầu-hệ-thống)
2. [Cài Đặt Môi Trường](#2-cài-đặt-môi-trường)
3. [Cấu Hình Database](#3-cấu-hình-database)
4. [Cấu Hình MapServer](#4-cấu-hình-mapserver)
5. [Cấu Hình Biến Môi Trường](#5-cấu-hình-biến-môi-trường)
6. [Cài Dependencies](#6-cài-dependencies)
7. [Chạy Ứng Dụng](#7-chạy-ứng-dụng)
8. [Triển Khai Production (Windows Server)](#8-triển-khai-production-windows-server)
9. [Import Dữ Liệu GIS](#9-import-dữ-liệu-gis)
10. [Kiến Trúc Hệ Thống](#10-kiến-trúc-hệ-thống)
11. [Cấu Trúc Dự Án](#11-cấu-trúc-dự-án)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Yêu Cầu Hệ Thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Node.js | 18.x trở lên | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 15.x trở lên + PostGIS | [postgresql.org](https://www.postgresql.org/) |
| Redis | 6.x trở lên | [redis.io](https://redis.io/) |
| MS4W (MapServer for Windows) | 4.x trở lên | [ms4w.com](https://ms4w.com/) — cần cho hiển thị WMS tile |
| PM2 | latest | `npm install -g pm2` (production) |
| Git | latest | |

> **Lưu ý:** MapServer (MS4W) là **bắt buộc** để hiển thị các lớp bản đồ (ranh giới xã, tiểu khu khoảnh, hiện trạng rừng). Nếu không cài, mapserver-service sẽ báo lỗi khi gọi WMS.

---

## 2. Cài Đặt Môi Trường

### 2.1 Node.js

```bash
# Kiểm tra phiên bản
node --version   # phải >= 18.x
npm --version
```

### 2.2 PostgreSQL + PostGIS

**Windows (khuyến nghị):**
1. Tải PostgreSQL từ [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Trong quá trình cài, chọn **Stack Builder** → cài **PostGIS**
3. Hoặc sau khi cài: mở Stack Builder → chọn server → Spatial Extensions → PostGIS

**Linux (Ubuntu/Debian):**
```bash
sudo apt install postgresql-15 postgresql-15-postgis-3
```

### 2.3 Redis

**Windows:**
```powershell
# Cách 1: Dùng Memurai (Redis-compatible for Windows)
# Tải từ: https://www.memurai.com/

# Cách 2: Redis port cho Windows
# https://github.com/tporadowski/redis/releases
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2.4 MS4W — MapServer for Windows

MS4W là gói cài đặt all-in-one cho MapServer trên Windows (bao gồm MapServer, GDAL, PROJ).

1. Tải MS4W từ: **https://ms4w.com/download.html** → chọn bản mới nhất (`ms4w-*.zip`)
2. Giải nén vào thư mục **`C:\ms4w\`** (bắt buộc dùng đúng đường dẫn này)
3. Kiểm tra:
   ```powershell
   C:\ms4w\Apache\cgi-bin\mapserv.exe -v
   # Phải in ra: MapServer version X.X.X ...
   ```

> **Quan trọng:** Đường dẫn `C:\ms4w\` là mặc định được dùng trong toàn bộ config. Nếu cài ở chỗ khác, phải cập nhật biến môi trường `MAPSERV_BIN`, `PROJ_LIB`, `GDAL_DATA` trong file `.env`.

**Linux (Ubuntu):**
```bash
sudo apt install mapserver-bin libmapserver-dev
which mapserv   # thường là /usr/bin/mapserv
```

### 2.5 PM2 (chỉ cần cho production)

```bash
npm install -g pm2
```

---

## 3. Cấu Hình Database

### 3.1 Tạo databases

Mở psql hoặc pgAdmin, chạy:

```sql
-- Tạo 3 databases
CREATE DATABASE auth_db;
CREATE DATABASE gis_db;
CREATE DATABASE admin_db;
```

### 3.2 Bật PostGIS extension

```sql
-- Kết nối vào từng database và bật PostGIS
\c gis_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

\c admin_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- auth_db không cần PostGIS (dùng Prisma ORM)
```

### 3.3 Restore cấu trúc bảng từ schema

```bash
# Windows (chạy trong PowerShell hoặc cmd, thêm password vào biến môi trường)
set PGPASSWORD=your_password

psql -U postgres -d auth_db  -f database/schemas/auth_db.sql
psql -U postgres -d admin_db -f database/schemas/admin_db.sql
psql -U postgres -d gis_db   -f database/schemas/gis_db.sql
```

> **Lưu ý:** Các file schema trong `database/schemas/` chứa cấu trúc bảng, indexes, functions, triggers — **không có dữ liệu thực**. Dữ liệu không gian (lớp rừng, tiểu khu) cần import riêng từ shapefile (xem [mục 9](#9-import-dữ-liệu-gis)).

### 3.4 Migrate Prisma (auth_db)

```bash
cd microservices/services/auth-service

# Generate Prisma client
npm run prisma:generate

# Chạy migrations (tạo bảng)
npm run prisma:migrate

# Seed dữ liệu mặc định (roles, permissions, admin user)
npm run prisma:seed
```

Tài khoản admin mặc định sau khi seed:
- **Username:** `admin`
- **Password:** `Admin@123456`

> Đổi mật khẩu sau khi đăng nhập lần đầu!

---

## 4. Cấu Hình MapServer

MapServer được dùng để render các lớp bản đồ GIS dưới dạng WMS tile (ranh giới xã, tiểu khu khoảnh, hiện trạng rừng).

### 4.1 Cập nhật mapserver-windows.conf

File `mapserver/mapserver-windows.conf` đã có sẵn trong repo. Kiểm tra đường dẫn đúng với máy chủ của bạn:

```conf
CONFIG
  ENV
    MS_MAP_PATTERN ".*"
    PROJ_DATA "C:/ms4w/share/proj"
    PROJ_LIB "C:/ms4w/share/proj"
    CURL_CA_BUNDLE "C:/ms4w/Apache/conf/ca-bundle/cacert.pem"
    MS_TEMPPATH "C:/DuBaoMatRung/mapserver/tmp/"
    MS_ERRORFILE "stderr"
    MS_DEBUGLEVEL "0"
  END

  MAPS
    sonla "C:/DuBaoMatRung/mapserver/mapfiles/sonla-windows-optimized.map"
    sonla_opt "C:/DuBaoMatRung/mapserver/mapfiles/sonla-windows-optimized.map"
  END
END
```

> Nếu project được đặt ở đường dẫn khác (không phải `C:/DuBaoMatRung/`), cập nhật tất cả các path trong file này.

### 4.2 Cập nhật mật khẩu database trong mapfile

Mapfile kết nối trực tiếp tới PostgreSQL. Mở file `mapserver/mapfiles/sonla-windows-optimized.map` và cập nhật **tất cả** dòng `CONNECTION`:

```
# Tìm tất cả dòng có dạng:
CONNECTION "host=localhost port=5432 dbname=admin_db user=postgres password=4"

# Đổi password=4 thành password thực của postgres:
CONNECTION "host=localhost port=5432 dbname=admin_db user=postgres password=YOUR_POSTGRES_PASSWORD"
```

Có thể dùng PowerShell để thay toàn bộ:
```powershell
(Get-Content "mapserver\mapfiles\sonla-windows-optimized.map") `
  -replace 'password=4', 'password=YOUR_POSTGRES_PASSWORD' |
  Set-Content "mapserver\mapfiles\sonla-windows-optimized.map"
```

### 4.3 Tạo thư mục tmp

```powershell
New-Item -ItemType Directory -Force -Path "C:\DuBaoMatRung\mapserver\tmp"
New-Item -ItemType Directory -Force -Path "C:\DuBaoMatRung\mapserver\logs"
```

### 4.4 Kiểm tra MapServer hoạt động

```powershell
# Test mapserv binary
C:\ms4w\Apache\cgi-bin\mapserv.exe -v

# Test với mapfile (phải in ra XML GetCapabilities nếu đúng)
$env:QUERY_STRING = "SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"
$env:MS_MAPFILE = "C:\DuBaoMatRung\mapserver\mapfiles\sonla-windows-optimized.map"
$env:MAPSERVER_CONFIG_FILE = "C:\DuBaoMatRung\mapserver\mapserver-windows.conf"
& "C:\ms4w\Apache\cgi-bin\mapserv.exe"
```

---

## 5. Cấu Hình Biến Môi Trường

### 5.1 Tạo file .env

```bash
cp microservices/.env.example microservices/.env
```

> Nếu không có file `.env.example`, tạo file `microservices/.env` với nội dung sau:

### 5.2 Nội dung file `microservices/.env`

```env
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password

DB_NAME=admin_db
DB_NAME_AUTH=auth_db
DB_NAME_GIS=gis_db
DB_NAME_ADMIN=admin_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_very_long_random_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_very_long_random_secret_here_min_32_chars

# Services (localhost cho server deployment)
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GIS_SERVICE_URL=http://localhost:3003
REPORT_SERVICE_URL=http://localhost:3004
ADMIN_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3006
MAPSERVER_SERVICE_URL=http://localhost:3007

# Ports
GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
GIS_SERVICE_PORT=3003
REPORT_SERVICE_PORT=3004
ADMIN_SERVICE_PORT=3005
SEARCH_SERVICE_PORT=3006
MAPSERVER_SERVICE_PORT=3007

# MapServer (bắt buộc nếu dùng GIS layer)
MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles\sonla-windows-optimized.map
MS_CONFIG_FILE=C:\DuBaoMatRung\mapserver\mapserver-windows.conf

# PROJ / GDAL (đi kèm MS4W, chỉnh nếu cài ở chỗ khác)
PROJ_LIB=C:\ms4w\share\proj
GDAL_DATA=C:\ms4w\gdaldata
```

> **Bảo mật:** Thay đổi `JWT_SECRET` và `REFRESH_TOKEN_SECRET` thành chuỗi ngẫu nhiên dài (>= 32 ký tự) trước khi chạy production.

### 5.3 Cấu hình Prisma (auth-service)

File `microservices/services/auth-service/.env`:
```env
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/auth_db?schema=public"
```

---

## 6. Cài Dependencies

```bash
# Từ thư mục gốc dự án
cd microservices
npm run install:all

# Cài frontend
cd ../client && npm install
```

---

## 7. Chạy Ứng Dụng

### 7.1 Development

```bash
# Từ thư mục gốc — chạy tất cả
npm run dev

# Hoặc chạy riêng
npm run dev:backend   # Tất cả microservices
npm run dev:frontend  # React + Vite (port 5173)
```

### 7.2 Truy cập

| URL | Mô tả |
|---|---|
| `http://localhost:5173` | Frontend (development) |
| `http://localhost:3000` | API Gateway |
| `http://localhost:3000/api-docs` | Swagger UI |
| `http://localhost:3007/wms?SERVICE=WMS&REQUEST=GetCapabilities` | MapServer WMS |

### 7.3 Kiểm tra services đang chạy

```bash
curl http://localhost:3000/health
curl http://localhost:3003/health  # GIS Service
curl http://localhost:3007/health  # MapServer Service
curl http://localhost:3001/health  # Auth Service
```

---

## 8. Triển Khai Production (Windows Server)

### 8.1 Build frontend

```bash
cd client
npm run build
# Output: client/dist/
```

### 8.2 Khởi động với PM2

```bash
cd microservices
pm2 start ecosystem.config.js

# Lưu config để tự khởi động khi reboot
pm2 save
pm2 startup
```

### 8.3 Quản lý PM2

```powershell
# Xem status tất cả services
pm2 status

# Xem logs
pm2 logs
pm2 logs gis-service --lines 50
pm2 logs mapserver-service --lines 50

# Restart
pm2 restart all
pm2 restart gis-service

# Stop
pm2 stop all
```

### 8.4 Nginx (tuỳ chọn — serve frontend + proxy API)

Cài Nginx: [nginx.org/en/download.html](https://nginx.org/en/download.html)

Cấu hình `C:\nginx\conf\nginx.conf`:
```nginx
http {
    upstream api {
        server localhost:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Frontend (built React app)
        location / {
            root C:/DuBaoMatRung/client/dist;
            try_files $uri $uri/ /index.html;
        }

        # API Proxy
        location /api/ {
            proxy_pass http://api/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 300s;
        }
    }
}
```

### 8.5 Flush Redis cache (khi cần)

```bash
redis-cli FLUSHDB

# Hoặc chỉ xóa cache của ứng dụng
redis-cli KEYS "layer:*" | xargs redis-cli DEL
redis-cli KEYS "matrung:*" | xargs redis-cli DEL
```

---

## 9. Import Dữ Liệu GIS

Dữ liệu không gian (lớp rừng, ranh giới xã, tiểu khu khoảnh) cần được import vào `admin_db`. Hệ thống hỗ trợ 3 cách:

### Cách 1: Qua UI (khuyến nghị)

1. Đăng nhập với tài khoản **Admin** hoặc **Công ty Fis**
2. Vào **Quản lý dữ liệu** → **Tải lên shapefile**
3. Upload file `.zip` chứa shapefile (`.shp`, `.dbf`, `.shx`, `.prj`)
4. Chọn bảng đích và tiến hành import

### Cách 2: Qua API

```bash
# Import từ shapefile ZIP
POST /api/gis/shapefile/import
Content-Type: multipart/form-data
# Body: file=<shapefile.zip>, tableName=<tên bảng>

# Import từ GeoJSON URL
POST /api/gis/shapefile/import-geojson-url
Content-Type: application/json
# Body: { "url": "...", "tableName": "..." }
```

### Cách 3: Dùng ogr2ogr (command line)

```bash
# ogr2ogr đi kèm MS4W tại C:\ms4w\tools\ogr2ogr.exe
C:\ms4w\tools\ogr2ogr.exe -f PostgreSQL ^
  PG:"host=localhost port=5432 dbname=admin_db user=postgres password=YOUR_PASSWORD" ^
  your_shapefile.shp ^
  -nln sonla_rgx -overwrite -lco GEOMETRY_NAME=geom -lco FID=gid
```

### Các bảng cần có trong `admin_db`

| Bảng | Mô tả | Dùng cho |
|---|---|---|
| `sonla_hientrangrung_new` | Hiện trạng rừng Sơn La | Layer hiển thị rừng |
| `sonla_tkkl` | Tiểu khu, khoảnh, lô | Lọc và phân tích theo tiểu khu |
| `sonla_rgx` | Ranh giới xã | Lọc theo đơn vị hành chính |

### Dữ liệu mất rừng (`gis_db`)

Bảng `son_la_mat_rung` trong `gis_db` chứa kết quả phân tích ảnh viễn thám. Import từ kết quả xử lý ảnh hoặc từ file Excel/shapefile:

```bash
# Cột quan trọng:
# - geom: geometry polygon (SRID 4326)
# - end_sau: ngày phát hiện mất rừng
# - dien_tich_ha: diện tích (hectare)
# - has_intersection: boolean, có giao với ranh giới xã/tiểu khu không
# - tinh, huyen, xa: tên địa danh hành chính
```

---

## 10. Kiến Trúc Hệ Thống

```
┌──────────────────────────────────┐
│   Browser / Client               │
│   React 19 + Vite (port 5173)    │
│   Leaflet Map + TailwindCSS      │
└─────────────┬────────────────────┘
              │ HTTP/REST
┌─────────────▼────────────────────────────────────┐
│            API Gateway (port 3000)               │
│  - JWT Authentication & validation               │
│  - User context injection (x-user-* headers)     │
│  - Rate limiting + CORS                          │
│  - Request proxy đến các microservices           │
└──────┬───────────────────────────────────────────┘
       │
       ├─► Auth Service      (3001)  Prisma ORM   ──► auth_db
       ├─► User Service      (3002)  Kysely       ──► auth_db
       ├─► GIS Service       (3003)  Kysely/pg    ──► gis_db + admin_db
       ├─► Report Service    (3004)  Kysely       ──► gis_db
       ├─► Admin Service     (3005)  Kysely       ──► admin_db
       ├─► Search Service    (3006)  Kysely       ──► gis_db + admin_db
       └─► MapServer Service (3007)  WMS proxy    ──► mapserv.exe → admin_db
                                                      (via PostGIS connection
                                                       trong mapfile)
```

### MapServer Flow

```
Frontend (Leaflet WMS layer)
  → GET /api/mapserver/wms?SERVICE=WMS&...
  → Gateway proxy → mapserver-service (3007)
  → mapserver-service spawn mapserv.exe
  → mapserv.exe đọc mapfile → query admin_db qua PostGIS
  → trả về PNG tile
```

### RBAC (Phân Quyền)

Format permission: `{module}.{resource}.{action}`

| Role | Mô tả | Phạm vi dữ liệu |
|---|---|---|
| Admin | Quản trị toàn hệ thống | Toàn quốc |
| Công ty Fis | Quản lý dữ liệu | Toàn tỉnh |
| Chi cục kiểm lâm | Xem và xác minh | Toàn tỉnh |
| LanhDao | Xem báo cáo | Toàn tỉnh |
| Kiểm lâm địa bàn | Xác minh thực địa | Theo xã/tiểu khu |

---

## 11. Cấu Trúc Dự Án

```
DuBaoMatRung/
├── client/                         # Frontend React 19 + Vite
│   ├── src/
│   │   ├── dashboard/
│   │   │   ├── contexts/           # GeoDataContext, AuthContext, ...
│   │   │   ├── pages/              # QuanLyDuLieu, Map, DuBaoMatRung, ...
│   │   │   └── components/         # Shared UI components
│   │   ├── services/               # API clients (axios)
│   │   └── config.js               # API endpoints
│   ├── public/
│   └── vite.config.js
│
├── microservices/
│   ├── gateway/                    # API Gateway (Express)
│   ├── services/
│   │   ├── auth-service/           # Authentication + RBAC (Prisma)
│   │   │   └── prisma/
│   │   │       ├── schema.prisma   # Data model
│   │   │       └── seed.js         # Initial data seeder
│   │   ├── gis-service/            # GIS data, shapefile, mất rừng
│   │   ├── user-service/           # User management
│   │   ├── report-service/         # Báo cáo thống kê
│   │   ├── admin-service/          # Admin functions
│   │   ├── search-service/         # Tìm kiếm
│   │   └── mapserver-service/      # WMS proxy → gọi mapserv.exe
│   ├── shared/                     # Thư viện dùng chung
│   │   ├── database/               # PostgreSQL connection pool
│   │   ├── redis/                  # Redis client
│   │   ├── logger/                 # Winston logger
│   │   ├── errors/                 # Custom error classes
│   │   ├── middleware/             # Auth, validation, error handler
│   │   └── utils/                  # Helpers, font converter, ...
│   └── .env                        # Biến môi trường (KHÔNG commit)
│
├── mapserver/                      # MapServer configuration
│   ├── mapfiles/                   # Map definition files
│   │   ├── sonla-windows-optimized.map   # Mapfile chính (Windows)
│   │   └── sonla.map                     # Mapfile Linux
│   ├── mapserver-windows.conf      # Config cho Windows (MS4W)
│   ├── mapserver.conf              # Config cho Linux
│   ├── tmp/                        # MapServer temp files (tự tạo)
│   └── logs/                       # MapServer logs (tự tạo)
│
├── database/
│   └── schemas/                    # Schema-only SQL dumps
│       ├── auth_db.sql             # Users, roles, permissions
│       ├── gis_db.sql              # Mất rừng, bang_ke_xu_ly_anh
│       └── admin_db.sql            # Lớp GIS (sonla_tkkl, sonla_rgx, ...)
│
├── docs/
│   ├── QUICKSTART.md
│   ├── DEPLOY_WINDOWS_SERVER.md
│   └── QUICK_START_DEPLOY.md
│
├── ecosystem.config.js             # PM2 config (tất cả services)
├── CLAUDE.md                       # Coding conventions, architecture
└── README.md                       # File này
```

---

## 12. Troubleshooting

### Lỗi kết nối database

```powershell
# Kiểm tra PostgreSQL đang chạy (Windows)
Get-Service postgresql*
Start-Service postgresql-x64-17

# Test kết nối
psql -U postgres -h localhost -c "SELECT version();"
```

### Lỗi PostGIS extension

```sql
-- Phải chạy trong database cần dùng
CREATE EXTENSION IF NOT EXISTS postgis;
-- Kiểm tra
SELECT PostGIS_version();
```

### Lỗi Prisma

```bash
cd microservices/services/auth-service
npx prisma generate       # Regenerate client
npx prisma migrate deploy  # Apply pending migrations
```

### Port bị chiếm

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

### Redis không kết nối được

```bash
redis-cli ping  # phải trả về PONG
net start Redis  # Windows
```

### MapServer không hoạt động

```powershell
# 1. Kiểm tra binary tồn tại
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# 2. Kiểm tra version
C:\ms4w\Apache\cgi-bin\mapserv.exe -v

# 3. Xem logs của mapserver-service
pm2 logs mapserver-service --lines 100

# 4. Kiểm tra health endpoint
curl http://localhost:3007/health
```

Lỗi thường gặp với MapServer:

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `Failed to spawn MapServer` | `MAPSERV_BIN` sai hoặc MS4W chưa cài | Kiểm tra đường dẫn trong `.env` |
| `msLoadMap(): Unable to open mapfile` | `MAPFILE_PATH` sai | Kiểm tra path trong `.env` |
| `Unable to connect to PostgreSQL` | Sai password trong mapfile | Sửa `CONNECTION` trong mapfile |
| `Unable to load PROJ` | `PROJ_LIB` chưa set | Set `PROJ_LIB=C:\ms4w\share\proj` trong `.env` |
| MapServer service `errored` trong PM2 | Port 3007 bị chiếm | `netstat -ano | findstr :3007` |

### Data không hiển thị trên bản đồ khi vào trang

Nguyên nhân thường gặp:
1. **Redis cache cũ** — flush cache: `redis-cli FLUSHDB`
2. **Chưa có dữ liệu** trong bảng `son_la_mat_rung` của `gis_db`
3. **Chưa import dữ liệu GIS** vào `admin_db` (bảng `sonla_tkkl`, `sonla_rgx`, `sonla_hientrangrung_new`)
4. **MapServer service lỗi** — kiểm tra `pm2 logs mapserver-service`

### GIS Service lỗi 500

```bash
pm2 logs gis-service --lines 50
# Kiểm tra kết nối tới cả gis_db VÀ admin_db
```

### Kiểm tra tất cả services

```bash
pm2 status
# Tất cả services phải có status: online

curl http://localhost:3000/health
curl http://localhost:3003/health
curl http://localhost:3007/health
curl http://localhost:3001/health
```

---

## Database Schemas

File schema trong `database/schemas/` được export từ PostgreSQL (schema-only, không có dữ liệu):

| File | Database | Nội dung |
|---|---|---|
| `auth_db.sql` | auth_db | Users, Roles, Permissions, UserRoles, RolePermissions, RoleDataScopes |
| `gis_db.sql` | gis_db | son_la_mat_rung, bang_ke_xu_ly_anh, functions, triggers |
| `admin_db.sql` | admin_db | sonla_hientrangrung_new, sonla_tkkl, sonla_rgx + spatial indexes |

---

## Monitoring (Production)

```powershell
# Real-time status
pm2 monit

# Log theo service
pm2 logs gis-service
pm2 logs gateway
pm2 logs auth-service
pm2 logs mapserver-service

# Restart sau khi cập nhật code
pm2 restart gis-service
pm2 restart all
```

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | React 19, Vite, TailwindCSS, Leaflet, react-window |
| API Gateway | Express.js, http-proxy-middleware |
| Microservices | Node.js, Express.js |
| Auth ORM | Prisma (auth_db) |
| GIS ORM | Kysely + node-postgres (pg) |
| Database | PostgreSQL 15+ + PostGIS |
| Cache | Redis |
| Process Manager | PM2 |
| GIS Server | MapServer (WMS) — via MS4W trên Windows |
| Shapefile | pure-JavaScript shapefile parser |

---

*Xem [CLAUDE.md](CLAUDE.md) để biết chi tiết kiến trúc, conventions, và hướng dẫn development đầy đủ.*
