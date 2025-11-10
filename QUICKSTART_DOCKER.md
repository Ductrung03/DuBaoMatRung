# Quick Start Guide - Docker Deployment

Hướng dẫn nhanh để deploy hệ thống Dự Báo Mất Rừng bằng Docker.

## Yêu Cầu

- Docker Desktop (Windows/Mac) hoặc Docker Engine (Linux)
- RAM: Tối thiểu 8GB (khuyến nghị 16GB)
- Disk: 50GB trống
- CPU: 4 cores+

## Cài Đặt Nhanh

### 1. Cài Docker Desktop

Windows: https://www.docker.com/products/docker-desktop

### 2. Clone/Copy Project

```bash
cd C:\Projects
# Copy project vào thư mục này
```

### 3. Chuẩn Bị Database Files

Đảm bảo có các file trong `docker-init/`:

```
docker-init/
├── postgres/01-auth-db.sql          (~31KB)
├── postgis/01-gis-db.sql            (~12MB)
└── admin-postgis/01-admin-db.sql    (~1.9GB)
```

### 4. Deploy Lần Đầu

```powershell
# Windows
.\deploy.ps1 -FirstTime
```

```bash
# Linux/Mac
docker-compose up -d
```

**Thời gian**: 10-20 phút (tùy thuộc database size)

### 5. Truy Cập Hệ Thống

- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- Admin: admin / admin123

## Các Lệnh Cơ Bản

```powershell
# Xem trạng thái
docker-compose ps

# Xem logs
.\deploy.ps1 -Logs

# Restart
.\deploy.ps1 -Restart

# Stop
.\deploy.ps1 -Stop

# Export databases
.\deploy.ps1 -ExportDB
```

## Architecture

```
PostgreSQL 17 (5432)      ─┬─► Auth Service (3001)
                          │
PostGIS 17 (5433)         ├─► GIS Service (3003) ◄─► Redis (6379)
                          │
PostGIS 17 (5434)         ├─► Admin Service (3005)
                          │
MongoDB 7 (27017)         ├─► All Services (logging)
                          │
                          └─► Gateway (3000) ◄─► Client (5173)
```

## Troubleshooting

### Database import chậm
```powershell
# Xem logs
.\deploy.ps1 -Logs -Service admin-postgis
```

### Service không start
```powershell
# Restart service
.\deploy.ps1 -Restart -Service "service-name"
```

### Port bị chiếm
```powershell
# Kiểm tra port
netstat -ano | findstr ":3000"

# Kill process
taskkill /PID [PID] /F
```

## Xem Thêm

- Chi tiết: `DEPLOYMENT_GUIDE.md`
- Docker init: `docker-init/README.md`
- Help: `.\deploy.ps1 -Help`

## Phiên Bản

- PostgreSQL: 17
- PostGIS: 17 (3.5)
- MongoDB: 7.0
- Redis: 7
- Node.js: 18+

---

**Lưu ý**: Đây là hướng dẫn nhanh. Xem `DEPLOYMENT_GUIDE.md` để biết chi tiết đầy đủ.
