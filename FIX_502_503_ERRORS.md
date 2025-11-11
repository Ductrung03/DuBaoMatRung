# Fix Lỗi 502 Bad Gateway và 503 Service Unavailable

## Lỗi Hiện Tại

```
Failed to load resource: the server responded with a status of 502 (Bad Gateway)
Failed to load resource: the server responded with a status of 503 (Service Unavailable)
❌ Response error: POST /api/auth/login
```

## Nguyên Nhân

Lỗi **502/503** xảy ra khi:
1. **Backend services chưa start xong** (đang trong quá trình khởi động)
2. **Database chưa sẵn sàng** (đang import data)
3. **Service crash** do lỗi config
4. **Gateway không connect được đến services**

## Giải Pháp

### 🚀 Quick Fix (Chạy ngay)

```powershell
# Bước 1: Kiểm tra trạng thái tất cả services
.\check-services-health.ps1

# Bước 2: Nếu có services failed, restart
docker-compose restart gateway auth-service gis-service

# Bước 3: Đợi 30 giây
Start-Sleep -Seconds 30

# Bước 4: Test lại
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### 🔍 Kiểm Tra Chi Tiết

#### 1. Check Docker Containers

```powershell
# Xem tất cả containers
docker-compose ps

# Tất cả phải có status "Up" và "healthy"
# Nếu có "Exited" hoặc "Unhealthy" → có vấn đề
```

**Expected output:**
```
NAME                       STATUS
dubaomatrung-gateway       Up (healthy)
dubaomatrung-auth          Up (healthy)
dubaomatrung-gis           Up
dubaomatrung-admin         Up
...
```

#### 2. Check Databases

```powershell
# PostgreSQL
docker exec dubaomatrung-postgres pg_isready -U postgres
# → Should return "accepting connections"

# PostGIS (gis_db)
docker exec dubaomatrung-postgis pg_isready -U postgres

# PostGIS (admin_db)
docker exec dubaomatrung-admin-postgis pg_isready -U postgres

# MongoDB
docker exec dubaomatrung-mongodb mongosh --eval "db.adminCommand('ping')"
# → Should return "ok: 1"

# Redis
docker exec dubaomatrung-redis redis-cli ping
# → Should return "PONG"
```

#### 3. Check Service Logs

```powershell
# Gateway logs (quan trọng nhất)
.\deploy.ps1 -Logs -Service gateway

# Auth service logs
.\deploy.ps1 -Logs -Service auth-service

# GIS service logs
.\deploy.ps1 -Logs -Service gis-service

# Admin service logs
.\deploy.ps1 -Logs -Service admin-service
```

**Tìm lỗi:**
- ❌ "Connection refused" → Database chưa sẵn sàng
- ❌ "ECONNREFUSED" → Service không connect được
- ❌ "Error: Cannot find module" → Thiếu dependencies
- ❌ "Database connection failed" → Sai config database

### 🔧 Fix Các Lỗi Thường Gặp

#### Lỗi 1: Services Starting Too Slow

**Triệu chứng**: 502/503 trong 1-2 phút đầu sau restart

**Fix**: Đợi thêm thời gian

```powershell
# Đợi tất cả services healthy
Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 60

# Check lại
docker-compose ps
```

#### Lỗi 2: Database Not Ready

**Triệu chứng**: Logs có "connection refused" hoặc "ECONNREFUSED"

**Fix**: Wait for databases

```powershell
# Check databases
docker exec dubaomatrung-postgres pg_isready -U postgres
docker exec dubaomatrung-postgis pg_isready -U postgres
docker exec dubaomatrung-admin-postgis pg_isready -U postgres

# Nếu không ready, restart databases
docker-compose restart postgres postgis admin-postgis

# Đợi 30s
Start-Sleep -Seconds 30

# Restart services sử dụng databases
docker-compose restart auth-service gis-service admin-service
```

#### Lỗi 3: Wrong Environment Variables

**Triệu chứng**: Services start nhưng không connect được với nhau

**Fix**: Check `.env` file

```powershell
# Kiểm tra .env
Get-Content .env

# Phải có các dòng này:
# DB_PASSWORD=4
# JWT_SECRET=<something>
# VITE_API_URL=http://103.56.160.66:3000
# FRONTEND_URL=http://103.56.160.66:5173
```

Nếu sai, sửa lại và restart:

```powershell
docker-compose restart gateway auth-service
```

#### Lỗi 4: Gateway Cannot Route to Services

**Triệu chứng**: Gateway OK nhưng auth/gis/admin services trả về 502

**Fix**: Check network và restart

```powershell
# Check network
docker network inspect dubaomatrung-network

# Restart tất cả
docker-compose restart
```

#### Lỗi 5: Port Conflicts

**Triệu chứng**: Container "Exited" ngay sau khi start

**Fix**: Check ports đang dùng

```powershell
# Check ports
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":5432"

# Nếu có process khác đang dùng, kill nó
taskkill /PID <PID> /F

# Restart services
docker-compose up -d
```

### 🛠️ Complete Reset (Nếu Tất Cả Fail)

Nếu các cách trên không được, reset toàn bộ:

```powershell
# 1. Stop tất cả
.\deploy.ps1 -Stop

# 2. Clean containers (GIỮ data)
docker-compose down

# 3. Start lại
docker-compose up -d

# 4. Đợi 2 phút
Start-Sleep -Seconds 120

# 5. Check
.\check-services-health.ps1
```

### 📊 Test Từng Service

Sau khi fix, test từng service:

```powershell
# Gateway health
curl http://localhost:3000/health
# → Should return {"status":"ok"}

# Auth service health
curl http://localhost:3001/health
# → Should return {"status":"ok"}

# Test login API
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

# Should return token
$response
```

### ⏱️ Thời Gian Khởi Động

Services cần thời gian khác nhau để start:

| Service | Thời gian |
|---------|-----------|
| Redis | 5-10s |
| MongoDB | 10-15s |
| PostgreSQL | 15-20s |
| PostGIS (gis_db) | 20-30s |
| PostGIS (admin_db) | 30-60s (do database lớn) |
| Gateway | 10-15s (sau khi MongoDB ready) |
| Auth Service | 15-20s (sau khi PostgreSQL ready) |
| GIS Service | 20-30s (sau khi PostGIS ready) |
| Admin Service | 30-60s (sau khi admin-postgis ready) |

**Tổng thời gian**: **1-2 phút** sau restart để tất cả services ready

### 🎯 Monitoring Script

Chạy script này để monitor real-time:

```powershell
# Monitor logs realtime
.\deploy.ps1 -Logs

# Hoặc specific service
.\deploy.ps1 -Logs -Service gateway
```

## Checklist Troubleshooting

- [ ] Check `docker-compose ps` → tất cả "Up"
- [ ] Check databases ready → `pg_isready` returns OK
- [ ] Check gateway logs → không có ERROR
- [ ] Check auth service logs → không có connection error
- [ ] Test `curl http://localhost:3000/health` → returns 200
- [ ] Test `curl http://localhost:3001/health` → returns 200
- [ ] Test `curl http://localhost:5173` → returns HTML
- [ ] Wait 2 minutes if just restarted
- [ ] Check `.env` file có đúng config không
- [ ] Check firewall không block local connections

## Sau Khi Fix Xong

Verify tất cả working:

```powershell
# 1. Run health check
.\check-services-health.ps1

# 2. Open browser
Start-Process "http://localhost:5173"

# 3. Try login with admin/admin123

# 4. If OK, test external access
Start-Process "http://103.56.160.66:5173"
```

## Common Error Messages và Fix

| Error Message | Fix |
|---------------|-----|
| "ECONNREFUSED" | Database chưa ready, wait 30s |
| "Connection refused" | Service chưa start, restart service |
| "Cannot find module" | Rebuild: `.\deploy.ps1 -Rebuild` |
| "Database connection failed" | Check `.env` DB_PASSWORD |
| "502 Bad Gateway" | Gateway chưa connect được services, restart gateway |
| "503 Service Unavailable" | Service đang starting, wait thêm |
| "CORS error" | Check CORS_ORIGINS in `.env` |

## Quick Commands Reference

```powershell
# Check everything
.\check-services-health.ps1

# Restart all
docker-compose restart

# Restart specific services
docker-compose restart gateway auth-service

# View logs
.\deploy.ps1 -Logs
.\deploy.ps1 -Logs -Service gateway

# Check containers
docker-compose ps

# Check specific service logs
docker logs dubaomatrung-gateway --tail 50

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health

# Complete restart
.\deploy.ps1 -Stop
docker-compose up -d
```

---

**TL;DR**: Chạy `.\check-services-health.ps1` rồi restart failed services. Đợi 2 phút để tất cả start xong.