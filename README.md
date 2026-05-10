# DuBaoMatRung — Hệ Thống Giám Sát & Dự Báo Mất Rừng

Hệ thống giám sát và dự báo mất rừng theo kiến trúc microservices, hỗ trợ phân tích ảnh viễn thám GIS, quản lý dữ liệu không gian, và báo cáo mất rừng tỉnh Sơn La.

---

## Mục Lục

1. [Yêu Cầu Hệ Thống](#1-yêu-cầu-hệ-thống)
2. [Cài Đặt Môi Trường](#2-cài-đặt-môi-trường)
3. [Cấu Hình Database](#3-cấu-hình-database)
4. [Cấu Hình Biến Môi Trường](#4-cấu-hình-biến-môi-trường)
5. [Cài Dependencies](#5-cài-dependencies)
6. [Chạy Ứng Dụng](#6-chạy-ứng-dụng)
7. [Triển Khai Production (Windows Server)](#7-triển-khai-production-windows-server)
8. [Kiến Trúc Hệ Thống](#8-kiến-trúc-hệ-thống)
9. [Cấu Trúc Dự Án](#9-cấu-trúc-dự-án)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Yêu Cầu Hệ Thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Node.js | 18.x trở lên | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 15.x trở lên + PostGIS | [postgresql.org](https://www.postgresql.org/) |
| Redis | 6.x trở lên | [redis.io](https://redis.io/) |
| PM2 | latest | `npm install -g pm2` (production) |
| Git | latest | |

> **Windows**: PostgreSQL cho Windows đã tích hợp sẵn PostGIS installer.  
> **Linux/Mac**: Cài thêm `postgis` extension sau khi cài PostgreSQL.

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

# Cách 2: WSL
wsl --install
# Trong WSL: sudo apt install redis-server

# Cách 3: Redis port cho Windows (cũ nhưng vẫn dùng được)
# https://github.com/tporadowski/redis/releases
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2.4 PM2 (chỉ cần cho production)

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
# Đường dẫn pg_restore trên Windows (điều chỉnh phiên bản PostgreSQL)
# set PGPASSWORD=your_password

psql -U postgres -d auth_db  -f database/schemas/auth_db.sql
psql -U postgres -d admin_db -f database/schemas/admin_db.sql
psql -U postgres -d gis_db   -f database/schemas/gis_db.sql
```

> **Lưu ý:** Các file schema trong `database/schemas/` chứa cấu trúc bảng, indexes, functions, triggers — **không có dữ liệu**. Dữ liệu thực (lớp rừng, tiểu khu, khoảnh) cần được import riêng từ shapefile GIS.

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

---

## 4. Cấu Hình Biến Môi Trường

### 4.1 Tạo file .env

```bash
cp microservices/.env.example microservices/.env
```

> Nếu không có file `.env.example`, tạo file `microservices/.env` với nội dung sau:

### 4.2 Nội dung file `microservices/.env`

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
JWT_SECRET=your_very_long_random_secret_key_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_very_long_random_secret_here

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
```

> **Bảo mật:** Thay đổi `JWT_SECRET` và `REFRESH_TOKEN_SECRET` thành chuỗi ngẫu nhiên dài (>= 32 ký tự) trước khi chạy production.

### 4.3 Cấu hình Prisma (auth-service)

File `microservices/services/auth-service/.env`:
```env
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/auth_db?schema=public"
```

---

## 5. Cài Dependencies

```bash
# Từ thư mục gốc dự án
cd microservices
npm run install:all

# Hoặc cài từng service
cd microservices/gateway && npm install
cd microservices/services/auth-service && npm install
cd microservices/services/gis-service && npm install
# ... (tương tự các service khác)

# Cài frontend
cd client && npm install
```

---

## 6. Chạy Ứng Dụng

### 6.1 Development (tất cả services)

```bash
# Từ thư mục gốc
npm run dev

# Hoặc chạy riêng
npm run dev:backend   # Chỉ backend (tất cả microservices)
npm run dev:frontend  # Chỉ frontend (React + Vite)
```

### 6.2 Truy cập

| URL | Mô tả |
|---|---|
| `http://localhost:5173` | Frontend (development) |
| `http://localhost:3000` | API Gateway |
| `http://localhost:3000/api-docs` | Swagger UI |

### 6.3 Kiểm tra services đang chạy

```bash
curl http://localhost:3000/health
curl http://localhost:3003/health  # GIS Service
curl http://localhost:3001/health  # Auth Service
```

---

## 7. Triển Khai Production (Windows Server)

### 7.1 Build frontend

```bash
cd client
npm run build
# Output: client/dist/
```

### 7.2 Khởi động với PM2

```bash
cd microservices
pm2 start ecosystem.config.js

# Hoặc khởi động từng service
pm2 start gateway/src/index.js --name gateway
pm2 start services/auth-service/src/index.js --name auth-service
pm2 start services/gis-service/src/index.js --name gis-service
pm2 start services/user-service/src/index.js --name user-service
pm2 start services/report-service/src/index.js --name report-service
pm2 start services/admin-service/src/index.js --name admin-service
pm2 start services/search-service/src/index.js --name search-service
pm2 start services/mapserver-service/src/index.js --name mapserver-service

# Lưu config để tự khởi động khi reboot
pm2 save
pm2 startup
```

### 7.3 Quản lý PM2

```powershell
# Xem status tất cả services
pm2 status

# Xem logs
pm2 logs
pm2 logs gis-service --lines 50

# Restart
pm2 restart all
pm2 restart gis-service

# Stop
pm2 stop all

# Xóa một service
pm2 delete clip-worker
```

### 7.4 Nginx (tuỳ chọn — serve frontend + proxy API)

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

### 7.5 Flush Redis cache (khi cần)

```bash
redis-cli FLUSHDB
# Hoặc chỉ xóa cache của ứng dụng
redis-cli KEYS "layer:*" | xargs redis-cli DEL
redis-cli KEYS "matrung:*" | xargs redis-cli DEL
```

---

## 8. Kiến Trúc Hệ Thống

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
       ├─► Auth Service    (3001)  Prisma ORM   ──► auth_db
       ├─► User Service    (3002)  Kysely       ──► auth_db
       ├─► GIS Service     (3003)  Kysely/pg    ──► gis_db + admin_db
       ├─► Report Service  (3004)  Kysely       ──► gis_db
       ├─► Admin Service   (3005)  Kysely       ──► admin_db
       ├─► Search Service  (3006)  Kysely       ──► gis_db + admin_db
       └─► MapServer Svc   (3007)  WMS proxy    ──► admin_db
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

## 9. Cấu Trúc Dự Án

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
│   │   └── mapserver-service/      # MapServer WMS proxy
│   └── shared/                     # Thư viện dùng chung
│       ├── database/               # PostgreSQL connection pool
│       ├── redis/                  # Redis client
│       ├── logger/                 # Winston logger
│       ├── errors/                 # Custom error classes
│       ├── middleware/             # Auth, validation, error handler
│       └── utils/                  # Helpers, font converter, ...
│
├── database/
│   └── schemas/                    # Schema-only SQL dumps
│       ├── auth_db.sql             # Users, roles, permissions
│       ├── gis_db.sql              # Mất rừng, bang_ke_xu_ly_anh
│       └── admin_db.sql            # Lớp GIS (sonla_tkkl, sonla_rgx, ...)
│
├── mapserver/                      # MapServer configuration
│   └── mapserver.conf
│
├── docs/
│   └── QUICKSTART.md
│
├── CLAUDE.md                       # Hướng dẫn đầy đủ cho Claude Code AI
├── CLAUDE.md                       # Coding conventions, architecture
└── README.md                       # File này
```

---

## 10. Troubleshooting

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
npx prisma migrate dev    # Development migrations
```

### Port bị chiếm

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux
lsof -i :3000
kill -9 <pid>
```

### Redis không kết nối được

```bash
# Kiểm tra Redis
redis-cli ping  # phải trả về PONG

# Windows (nếu dùng Memurai/Redis)
net start Redis
```

### Data không hiển thị trên bản đồ khi vào trang

Nguyên nhân thường gặp:
1. **Redis cache cũ** — flush cache: `redis-cli FLUSHDB`
2. **Chưa có dữ liệu** trong bảng `son_la_mat_rung` của `gis_db`
3. **Chưa import dữ liệu GIS** vào `admin_db` (bảng `sonla_tkkl`, `sonla_rgx`, `sonla_hientrangrung_new`)

### GIS Service lỗi 500

```bash
pm2 logs gis-service --lines 50
# Kiểm tra kết nối tới cả gis_db VÀ admin_db
```

### Kiểm tra tất cả services

```bash
pm2 status
# Tất cả services phải có status: online

# Kiểm tra health endpoint
curl http://localhost:3000/health
curl http://localhost:3003/health
curl http://localhost:3001/health
```

---

## Import Dữ Liệu GIS

Dữ liệu không gian (lớp rừng, ranh giới xã, tiểu khu khoảnh) cần được import vào `admin_db`:

1. **Qua UI** — Đăng nhập → Quản lý dữ liệu → Tải lên shapefile ZIP
2. **Qua API** — `POST /api/gis/shapefile/import` hoặc `POST /api/gis/shapefile/import-geojson-url`
3. **Qua psql** — Import trực tiếp shapefile đã chuyển đổi sang SQL

Các bảng cần có trong `admin_db`:

| Bảng | Mô tả |
|---|---|
| `sonla_hientrangrung_new` | Hiện trạng rừng Sơn La |
| `sonla_tkkl` | Tiểu khu, khoảnh, lô |
| `sonla_rgx` | Ranh giới xã |

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
| GIS Server | MapServer (WMS) |
| Shapefile | pure-JavaScript shapefile parser |

---

*Xem [CLAUDE.md](CLAUDE.md) để biết chi tiết kiến trúc, conventions, và hướng dẫn development đầy đủ.*
