# DuBaoMatRung — Hệ Thống Giám Sát & Dự Báo Mất Rừng

Hệ thống giám sát và dự báo mất rừng theo kiến trúc microservices, hỗ trợ phân tích ảnh viễn thám GIS, quản lý dữ liệu không gian, và báo cáo mất rừng tỉnh Sơn La.

---

## Mục lục

1. [Chạy bằng Docker (Khuyến nghị)](#1-chạy-bằng-docker-khuyến-nghị)
2. [Chạy thủ công (Development)](#2-chạy-thủ-công-development)
3. [Cấu hình môi trường](#3-cấu-hình-môi-trường)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Quản lý Docker](#5-quản-lý-docker)
6. [Database](#6-database)
7. [Test & kiểm tra](#7-test--kiểm-tra)
8. [Troubleshooting](#8-troubleshooting)
9. [Deploy lên server mới](#9-deploy-lên-server-mới)

---

## 1. Chạy bằng Docker (Khuyến nghị)

### Yêu cầu

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|----------|---------------------|----------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | v2.20+ | `docker compose version` |
| RAM | 4 GB (khuyến nghị 8 GB) | |
| Disk trống | 10 GB | |

> **Windows**: Dùng Docker Desktop hoặc WSL2 + Docker Engine.

### Bước 1: Chuẩn bị cấu hình

```bash
cp .env.docker .env
```

Mở `.env` và kiểm tra — **các giá trị mặc định chạy được ngay** cho môi trường dev/test. Production thì đổi `DB_PASSWORD`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (xem [mục 3](#3-cấu-hình-môi-trường)).

### Bước 2: Build và khởi động

```bash
# Disable intern postgresql and redis if needed
# sudo systemctl stop redis-server postgresql@18-main postgresql
docker compose up -d --build

# Nếu gặp lỗi build mapserver-service, thử:
docker compose down
docker compose build --no-cache --progress=plain mapserver-service
docker compose up -d

# Seed first (if not seeded already in Docker compose yml)
docker compose exec -T auth-service npm run prisma:seed
```

Lần đầu build mất **5–15 phút** (tải Node.js, cài npm, build React frontend, tải MapServer binary).

Theo dõi tiến trình:

```bash
docker compose logs -f
```

### Bước 3: Kiểm tra sẵn sàng

```bash
docker compose ps
```

Tất cả containers phải ở trạng thái **healthy** (mất khoảng 1–3 phút sau khi `up`).

```bash
curl http://localhost:3000/health
# Kết quả: {"status":"ok",...}
```

### Bước 4: Truy cập

| URL | Mô tả |
|-----|-------|
| `http://localhost:3000` | Web Application |
| `http://localhost:3000/api-docs` | Swagger API Docs |
| `http://localhost:3000/health` | Health check |

---

## 2. Chạy thủ công (Development)

Dùng khi cần debug code, hot-reload.

### Yêu cầu

- Node.js 18+, npm 9+
- PostgreSQL 15+ với PostGIS
- Redis 7+
- MapServer (MS4W trên Windows)

### Bước 1: Tạo databases và import dữ liệu

```sql
-- Chạy trong psql
CREATE DATABASE auth_db;
CREATE DATABASE gis_db;
CREATE DATABASE admin_db;

\c gis_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

\c admin_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgres_fdw;
```

```bash
psql -U postgres -d auth_db  < database/schemas/auth_db.sql
psql -U postgres -d gis_db   < database/schemas/gis_db.sql
psql -U postgres -d admin_db < database/schemas/admin_db.sql
```

### Bước 2: Cấu hình môi trường

```bash
cp microservices/.env.template microservices/.env
```

Chỉnh `microservices/.env` với thông tin PostgreSQL local, Redis local.

### Bước 3: Generate Prisma client

```bash
cd microservices/services/auth-service
npm install
npx prisma generate
cd ../../..
```

### Bước 4: Cài dependencies và chạy

```bash
cd microservices && npm install && cd ..
cd client && npm install && cd ..

# Chạy backend + frontend cùng lúc
npm run dev
```

Frontend dev: `http://localhost:5173`  
Backend: `http://localhost:3000`

---

## 3. Cấu hình môi trường

### File `.env` dùng với Docker

```env
# Môi trường
NODE_ENV=production
LOG_LEVEL=info
APP_PORT=3000

# URL frontend (thay IP thực tế khi deploy server xa)
FRONTEND_URL=http://localhost:3000

# Database — ĐỔI TRONG PRODUCTION
DB_PASSWORD=DuBaoMatRung2025SecurePass

# JWT Secrets — ĐỔI THÀNH CHUỖI NGẪU NHIÊN TRONG PRODUCTION
JWT_SECRET=dubaomatrung_jwt_secret_production_key_2025_secure_random_string
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=dubaomatrung_refresh_jwt_secret_production_key_2025_secure_random_string
REFRESH_TOKEN_EXPIRES_IN=30d

# Ports expose ra host (thay nếu bị conflict)
POSTGRES_PORT=5432
REDIS_PORT=6379
MONGODB_PORT=27017
```

### Tạo JWT Secret mạnh cho production

```bash
# Linux/macOS/WSL
openssl rand -base64 64

# Node.js (chạy ở bất kỳ đâu)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Kiến trúc hệ thống

```
┌────────────────────────────────────────────────────────┐
│                    Docker Network                      │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │          gateway:3000                           │◄─┼── Port 3000 (public)
│  │  - Serve React frontend (SPA)                   │  │
│  │  - Proxy API → microservices                    │  │
│  │  - JWT auth, rate limit, CORS, Swagger          │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │ HTTP proxy                   │
│  ┌──────────────────────▼──────────────────────────┐  │
│  │               Microservices                     │  │
│  │  auth:3001       user:3002    gis:3003           │  │
│  │  report:3004     admin:3005   search:3006        │  │
│  │  mapserver:3008                                 │  │
│  └──────────────────────┬──────────────────────────┘  │
│                         │                             │
│  ┌──────────────────────▼──────────────────────────┐  │
│  │  postgres:5432   redis:6379   mongodb:27017      │  │
│  └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Services và Databases

| Service | Port | Database | Mô tả |
|---------|------|----------|-------|
| gateway | 3000 | — | API Gateway + Frontend React |
| auth-service | 3001 | auth_db | Đăng nhập, JWT, RBAC |
| user-service | 3002 | auth_db | Quản lý tài khoản |
| gis-service | 3003 | gis_db | Dữ liệu GIS, shapefile, PostGIS |
| report-service | 3004 | gis_db | Xuất báo cáo DOCX/PDF |
| admin-service | 3005 | admin_db | Danh mục hành chính, dropdown |
| search-service | 3006 | gis_db | Tìm kiếm, lọc mất rừng |
| mapserver-service | 3008 | admin_db + gis_db | WMS/WFS qua MapServer |
| postgres | 5432 | — | PostgreSQL 15 + PostGIS 3.4 |
| redis | 6379 | — | Cache tile WMS |
| mongodb | 27017 | — | Log gateway (không bắt buộc) |

---

## 5. Quản lý Docker

### Lệnh thường dùng

```bash
# Trạng thái containers
docker compose ps

# Logs realtime
docker compose logs -f                 # tất cả
docker compose logs -f gateway         # chỉ gateway
docker compose logs --tail=100 gis-service

# Restart một service
docker compose restart gateway

# Vào shell trong container
docker compose exec gateway sh
docker compose exec postgres psql -U postgres

# Dừng (giữ data)
docker compose down

# Dừng và XÓA TOÀN BỘ DATA
docker compose down -v
```

### Rebuild sau khi thay đổi code

```bash
# Rebuild service cụ thể (nhanh)
docker compose build gateway && docker compose up -d gateway

# Rebuild tất cả từ đầu
docker compose build --no-cache && docker compose up -d
```

---

## 6. Database

### Backup

```bash
# Backup từng database
docker compose exec postgres pg_dump -U postgres auth_db  > backup/auth_db_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U postgres gis_db   > backup/gis_db_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U postgres admin_db > backup/admin_db_$(date +%Y%m%d).sql
```

### Restore

```bash
cat backup/auth_db_20260516.sql | docker compose exec -T postgres psql -U postgres -d auth_db
cat backup/gis_db_20260516.sql  | docker compose exec -T postgres psql -U postgres -d gis_db
```

### Kết nối trực tiếp

```bash
# Vào psql trong container
docker compose exec postgres psql -U postgres -d gis_db

# Từ host (nếu port 5432 được expose)
psql -h localhost -U postgres -d auth_db
```

### Reset database

```bash
docker compose down
docker volume rm dubaomatrung_postgres_data
docker compose up -d
```

---

## 7. Test & kiểm tra

### Test tự động

```bash
bash docker-test.sh
# Hoặc server khác:
bash docker-test.sh http://192.168.1.100:3000
```

Kiểm tra: gateway health, frontend, auth login/JWT, GIS, admin, search, MapServer WMS, báo cáo, container health.

### Test thủ công

```bash
# Health check
curl http://localhost:3000/health

# Đăng nhập lấy token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Dữ liệu mất rừng (public)
curl http://localhost:3000/api/mat-rung

# WMS GetCapabilities
curl "http://localhost:3000/api/mapserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0"

# Dropdown tỉnh
curl http://localhost:3000/api/dropdown/tinh
```

---

## 8. Troubleshooting

### Containers không healthy

```bash
# Xem log chi tiết
docker compose logs --tail=50 <service-name>

# auth-service không kết nối được DB
docker compose logs auth-service
# Thường gặp: postgres chưa ready → services tự restart sau vài giây, chờ thêm
```

### Database trống — không có dữ liệu

```bash
# Kiểm tra init scripts có chạy không
docker compose logs postgres | grep -E "init-db|Restore|restored|ERROR"
```

Nếu không thấy log restore → import thủ công:

```bash
cat database/schemas/auth_db.sql  | docker compose exec -T postgres psql -U postgres -d auth_db
cat database/schemas/gis_db.sql   | docker compose exec -T postgres psql -U postgres -d gis_db
cat database/schemas/admin_db.sql | docker compose exec -T postgres psql -U postgres -d admin_db
```

### MapServer lỗi WMS

```bash
# Kiểm tra mapserv binary
docker compose exec mapserver-service mapserv -v

# Kiểm tra mapfile đã generate
docker compose exec mapserver-service cat /mapserver/mapfiles/sonla-docker.map | head -5

# Kiểm tra kết nối DB từ mapserver
docker compose exec mapserver-service wget -qO- http://localhost:3008/health
```

### Frontend hiện trang trắng

```bash
# Kiểm tra dist có tồn tại
docker compose exec gateway ls /app/client/dist/

# Rebuild gateway (bao gồm rebuild frontend)
docker compose build gateway && docker compose up -d gateway
```

### Port bị chiếm

```bash
# Windows
netstat -ano | findstr :3000

# Linux
lsof -i :3000

# Đổi port
echo "APP_PORT=3001" >> .env
docker compose up -d gateway
```

### Disk đầy

```bash
docker system prune -f          # Xóa containers, networks không dùng
docker image prune -a -f        # Xóa images cũ
docker volume prune -f          # Xóa volumes không dùng (cẩn thận!)
```

### Reset hoàn toàn

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## 9. Deploy lên server mới

### Yêu cầu server

- OS: Ubuntu 22.04+ / Debian 12+ / Windows Server 2022+
- Docker 24+ và Docker Compose v2+
- RAM 4 GB+, Disk 20 GB+
- Port 3000 mở từ internet (hoặc port khác)

### Các bước

**1. Cài Docker (Ubuntu/Debian)**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout và login lại để có quyền docker
```

**2. Copy project**

```bash
# Qua SCP
scp -r /c/DuBaoMatRung user@server:/opt/dubaomatrung

# Hoặc git clone (nếu có repo)
git clone <repo-url> /opt/dubaomatrung
```

**3. Cấu hình production**

```bash
cd /opt/dubaomatrung
cp .env.docker .env
nano .env
```

Cập nhật trong `.env`:

```env
NODE_ENV=production
APP_PORT=3000
FRONTEND_URL=http://<IP_SERVER>:3000

DB_PASSWORD=<mat_khau_manh>
JWT_SECRET=<64_ky_tu_ngau_nhien>
REFRESH_TOKEN_SECRET=<64_ky_tu_ngau_nhien_khac>
```

**4. Khởi động**

```bash
docker compose up -d --build
```

**5. Kiểm tra**

```bash
bash docker-test.sh http://<IP_SERVER>:3000
```

### Tự khởi động khi server reboot (Linux systemd)

```bash
sudo tee /etc/systemd/system/dubaomatrung.service > /dev/null << 'EOF'
[Unit]
Description=DuBaoMatRung
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/opt/dubaomatrung
ExecStart=/usr/bin/docker compose up
ExecStop=/usr/bin/docker compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable dubaomatrung
sudo systemctl start dubaomatrung
```

### Nginx reverse proxy (port 80/443)

```nginx
server {
    listen 80;
    server_name dubaomatrung.example.com;

    client_max_body_size 50m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

---

## Cấu trúc thư mục

```
DuBaoMatRung/
├── client/                     # React 19 + Vite frontend
│   └── src/
│       ├── components/         # UI components
│       ├── pages/              # Route pages
│       ├── services/api.js     # Axios API client
│       └── config.js           # API URL (tự động dùng relative URL với Docker)
│
├── microservices/
│   ├── gateway/                # API Gateway (port 3000)
│   ├── services/
│   │   ├── auth-service/       # JWT + RBAC, Prisma ORM (port 3001)
│   │   ├── user-service/       # Quản lý user (port 3002)
│   │   ├── gis-service/        # GIS + PostGIS + shapefile (port 3003)
│   │   ├── report-service/     # Xuất DOCX/PDF (port 3004)
│   │   ├── admin-service/      # Danh mục hành chính (port 3005)
│   │   ├── search-service/     # Tìm kiếm (port 3006)
│   │   └── mapserver-service/  # WMS/WFS proxy → mapserv (port 3008)
│   └── shared/                 # Logger, DB pool, Redis, errors
│
├── database/
│   └── schemas/                # SQL dumps: auth_db.sql, gis_db.sql, admin_db.sql
│
├── mapserver/
│   └── mapfiles/               # MapServer .map files (Windows + Docker versions)
│
├── docker/                     # Docker build files
│   ├── Dockerfile.gateway      # Multi-stage: build React → gateway
│   ├── Dockerfile.auth-service # Node + Prisma generate
│   ├── Dockerfile.gis-service  # Node slim (Debian)
│   ├── Dockerfile.mapserver-service  # Node + mapserv binary via apt
│   ├── Dockerfile.node-service # Generic: user/report/admin/search
│   ├── init-db/                # PostgreSQL init scripts
│   │   ├── 01-create-databases.sh   # Tạo 3 DB + PostGIS extension
│   │   └── 02-restore-databases.sh  # Import SQL dumps
│   ├── mapfiles/
│   │   └── sonla-docker.map.template  # Linux mapfile với ${DB_HOST} envsubst
│   ├── mapserver.conf
│   └── mapserver-entrypoint.sh # Generate mapfile từ env, khởi động Node
│
├── docker-compose.yml          # Orchestration 11 containers
├── .env.docker                 # Template cấu hình Docker
├── .dockerignore
├── docker-start.sh             # Script khởi động với health check tự động
└── docker-test.sh              # Script test đầy đủ mọi endpoints
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, Leaflet (WMS tiles) |
| API Gateway | Express.js, http-proxy-middleware, JWT middleware |
| Auth | JWT, bcrypt, Prisma ORM, RBAC |
| GIS | Express.js, Kysely, PostGIS, shapefile parser |
| Mapping | MapServer 7 (WMS/WFS binary), Leaflet |
| Database | PostgreSQL 15 + PostGIS 3.4 |
| Cache | Redis 7 (tile cache) |
| Logging | Winston (files + console), MongoDB (gateway logs) |
| Container | Docker 24, Docker Compose v2 |
