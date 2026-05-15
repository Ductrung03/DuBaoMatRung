# Docker Deployment - DuBaoMatRung

## Yêu cầu

- Docker 24+ và Docker Compose v2+
- RAM: tối thiểu 4GB (khuyến nghị 8GB)
- Disk: tối thiểu 10GB free

## Khởi động nhanh

```bash
# 1. Copy và cấu hình environment
cp .env.docker .env
# Chỉnh sửa .env nếu cần (mặc định dùng được ngay)

# 2. Build và chạy toàn bộ hệ thống
chmod +x docker-start.sh
./docker-start.sh

# Hoặc chạy thủ công:
docker compose up -d --build
```

Sau khi chạy xong, truy cập:
- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

## Kiến trúc Docker

```
┌─────────────────────────────────────────────────┐
│                  docker network                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  gateway:3000 (Frontend + API Gateway)   │   │◄── Port 3000 (public)
│  └──────────┬───────────────────────────────┘   │
│             │ proxy                              │
│  ┌──────────▼──────────────────────────────┐   │
│  │  auth:3001  user:3002  gis:3003          │   │
│  │  report:3004  admin:3005  search:3006   │   │
│  │  mapserver-service:3008                  │   │
│  └──────────┬───────────────────────────────┘   │
│             │                                    │
│  ┌──────────▼──────────────────────────────┐   │
│  │  postgres:5432  redis:6379  mongo:27017  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Services

| Service | Container | Port (internal) |
|---------|-----------|-----------------|
| API Gateway + Frontend | dubao_gateway | 3000 |
| Auth Service | dubao_auth | 3001 |
| User Service | dubao_user | 3002 |
| GIS Service | dubao_gis | 3003 |
| Report Service | dubao_report | 3004 |
| Admin Service | dubao_admin | 3005 |
| Search Service | dubao_search | 3006 |
| MapServer Service | dubao_mapserver | 3008 |
| PostgreSQL + PostGIS | dubao_postgres | 5432 |
| Redis | dubao_redis | 6379 |
| MongoDB (logging) | dubao_mongodb | 27017 |

## Quản lý

```bash
# Xem status các container
docker compose ps

# Xem logs
docker compose logs -f                    # Tất cả
docker compose logs -f gateway            # Chỉ gateway
docker compose logs -f gis-service        # Chỉ GIS

# Restart service
docker compose restart gateway
docker compose restart gis-service

# Dừng hệ thống (giữ dữ liệu)
docker compose down

# Dừng và xóa hết dữ liệu (CẢNH BÁO: mất dữ liệu!)
docker compose down -v

# Rebuild image khi thay đổi code
docker compose build gateway
docker compose up -d gateway
```

## Test

```bash
chmod +x docker-test.sh
./docker-test.sh
# Hoặc với URL khác:
./docker-test.sh http://192.168.1.100:3000
```

## Database

```bash
# Kết nối PostgreSQL
docker compose exec postgres psql -U postgres -d auth_db

# Backup tất cả databases
docker compose exec postgres pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql

# Backup từng database
docker compose exec postgres pg_dump -U postgres auth_db > auth_db_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U postgres gis_db > gis_db_$(date +%Y%m%d).sql
docker compose exec postgres pg_dump -U postgres admin_db > admin_db_$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U postgres
```

## Cấu hình Production

Cập nhật `.env` với giá trị thực tế:

```env
NODE_ENV=production
DB_PASSWORD=<mật_khẩu_mạnh>
JWT_SECRET=<chuỗi_ngẫu_nhiên_64_ký_tự>
REFRESH_TOKEN_SECRET=<chuỗi_ngẫu_nhiên_64_ký_tự_khác>
FRONTEND_URL=http://<ip_server>:3000
APP_PORT=3000
```

## Troubleshooting

**PostgreSQL không khởi động:**
```bash
docker compose logs postgres
# Xóa volume cũ nếu bị corrupt:
docker compose down -v && docker compose up -d postgres
```

**Service không connect được database:**
```bash
docker compose logs auth-service
# Kiểm tra env vars:
docker compose exec auth-service env | grep DB
```

**MapServer không hoạt động:**
```bash
docker compose logs mapserver-service
# Kiểm tra mapserv binary:
docker compose exec mapserver-service which mapserv
docker compose exec mapserver-service mapserv -v
```

**Rebuild sau khi thay đổi code:**
```bash
docker compose build --no-cache
docker compose up -d
```
