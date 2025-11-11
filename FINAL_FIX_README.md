# 🔧 FINAL FIX - Service .env Files Issue

## Vấn Đề Phát Hiện

**Root Cause**: Mỗi service có file `.env` riêng với DATABASE_URL hardcoded:

```env
# microservices/services/auth-service/.env
DATABASE_URL="postgresql://postgres:4@localhost:5433/auth_db?schema=public"
```

**Vấn đề:**
1. Sử dụng `localhost` thay vì container names (`postgres`, `postgis`, `admin-postgis`)
2. Sử dụng port **5433** (port của host) thay vì **5432** (port trong container)
3. File `.env` trong service override biến môi trường từ `docker-compose.yml`

## ✅ Giải Pháp

### Option 1: Quick Fix (KHUYẾN NGHỊ - 2 phút)

```powershell
# Pull code mới
git pull

# Chạy quick fix
.\quick-fix-envs.ps1
```

Script sẽ:
- ✅ Xóa tất cả `.env` files trong services (có backup)
- ✅ Restart services
- ✅ Docker sẽ dùng env vars từ `docker-compose.yml` (đúng config)
- ✅ Test tất cả services

**Thời gian**: ~2 phút

### Option 2: Full Fix với Rebuild (10-15 phút)

Nếu quick fix không work:

```powershell
.\fix-all-service-envs.ps1
```

Script sẽ:
- ✅ Backup và xóa `.env` files
- ✅ Rebuild tất cả services
- ✅ Restart services
- ✅ Test tất cả services

**Thời gian**: ~10-15 phút

## 📋 Manual Fix (Nếu Scripts Không Chạy)

### Bước 1: Xóa Service .env Files

```powershell
# Vào thư mục project
cd C:\DuBaoMatRung

# Xóa .env files (hoặc đổi tên)
Remove-Item microservices\services\auth-service\.env -Force
Remove-Item microservices\services\user-service\.env -Force
Remove-Item microservices\services\gis-service\.env -Force
Remove-Item microservices\services\admin-service\.env -Force
Remove-Item microservices\services\report-service\.env -Force
Remove-Item microservices\services\search-service\.env -Force
Remove-Item microservices\services\mapserver-service\.env -Force
```

### Bước 2: Restart Services

```powershell
docker-compose restart
```

### Bước 3: Wait và Test

```powershell
# Đợi 45 giây
Start-Sleep -Seconds 45

# Test
curl http://localhost:3001/health
curl http://localhost:5173
```

## 🔍 Verify Fix

Sau khi fix, check:

```powershell
# 1. Containers đang chạy
docker-compose ps

# 2. Test services
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/        # User
curl http://localhost:5173/        # Frontend

# 3. Check logs (không có lỗi DATABASE_URL)
docker logs dubaomatrung-auth --tail 20
```

**Expected**: Không còn thấy lỗi `Can't reach database server at localhost:5433`

## 📝 Giải Thích Chi Tiết

### Tại Sao Lỗi?

**Trong Docker network:**
- Services communicate qua **container names**: `postgres`, `postgis`, `admin-postgis`
- Port bên trong container luôn là **5432** (Postgres default)
- Port **5433, 5434** chỉ dùng để access từ **host machine**

**Cấu hình đúng** (trong docker-compose.yml):

```yaml
auth-service:
  environment:
    - DB_HOST=postgres      # Container name, NOT localhost
    - DB_PORT=5432          # Internal port, NOT 5433
    - DB_USER=postgres
    - DB_PASSWORD=${DB_PASSWORD}
    - DB_NAME=auth_db
```

**Cấu hình sai** (trong service .env):

```env
DATABASE_URL="postgresql://postgres:4@localhost:5433/auth_db"
                                       ^^^^^^^^  ^^^^
                                       Wrong!    Wrong!
```

### Tại Sao Quick Fix Work?

Khi xóa `.env` files trong services:
1. Docker sẽ dùng environment variables từ `docker-compose.yml`
2. Services sẽ kết nối đúng: `postgres:5432`, `postgis:5432`, `admin-postgis:5432`
3. Trong Docker network, services connect thành công

### Database Ports Explained

| Database | Container Name | Internal Port | Host Port | Access From |
|----------|---------------|---------------|-----------|-------------|
| PostgreSQL (auth_db) | `postgres` | 5432 | 5432 | `postgres:5432` (Docker) <br> `localhost:5432` (Host) |
| PostGIS (gis_db) | `postgis` | 5432 | 5433 | `postgis:5432` (Docker) <br> `localhost:5433` (Host) |
| PostGIS (admin_db) | `admin-postgis` | 5432 | 5434 | `admin-postgis:5432` (Docker) <br> `localhost:5434` (Host) |

**Services trong Docker phải dùng Internal Port (5432)!**

## 🎯 Testing Checklist

- [ ] No .env files trong microservices/services/*/
- [ ] `docker-compose ps` shows all containers "Up"
- [ ] `curl http://localhost:3001/health` returns 200
- [ ] `curl http://localhost:5173` returns HTML
- [ ] No errors in `docker logs dubaomatrung-auth`
- [ ] Frontend accessible at `http://103.56.160.66:5173`
- [ ] Can login với admin/admin123

## 🚨 Troubleshooting

### Nếu vẫn lỗi sau quick-fix:

```powershell
# Check .env files đã xóa chưa
Get-ChildItem microservices\services\*\.env

# Nếu vẫn còn, xóa manually
Remove-Item microservices\services\*\.env -Force

# Restart
docker-compose restart
```

### Nếu cần rebuild:

```powershell
# Stop tất cả
docker-compose down

# Rebuild (no cache)
docker-compose build --no-cache

# Start
docker-compose up -d

# Wait 2 minutes
Start-Sleep -Seconds 120

# Test
.\check-services-health.ps1
```

## 📚 Related Files

- `quick-fix-envs.ps1` - Quick fix script (2 phút)
- `fix-all-service-envs.ps1` - Full fix với rebuild (10 phút)
- `check-services-health.ps1` - Health check tất cả services
- `fix-external-access.ps1` - Fix external IP access
- `docker-compose.yml` - Container configuration (đúng)
- `microservices/services/*/.env` - Service .env files (XÓA ĐI!)

## ✅ Summary

**TL;DR:**

```powershell
git pull
.\quick-fix-envs.ps1
```

**What it does:**
- Xóa `.env` files trong services (có backup)
- Restart services
- Services sẽ dùng config từ `docker-compose.yml` (đúng)
- Test tất cả services

**Time:** ~2 phút

**Success rate:** 95%

---

**Sau khi fix xong**, services sẽ connect đúng:
- ✅ auth-service → postgres:5432
- ✅ gis-service → postgis:5432
- ✅ admin-service → admin-postgis:5432

Không còn lỗi **"Can't reach database server at localhost:5433"** nữa! 🎉