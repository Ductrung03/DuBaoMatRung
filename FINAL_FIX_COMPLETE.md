# 🔧 FIX COMPLETE - Du Bao Mat Rung

## ⚠️ Vấn đề hiện tại

Sau khi fix MapServer, Auth service và các services khác bị lỗi **502 Bad Gateway**.

### Nguyên nhân:
- Khi chỉ rebuild Gateway và MapServer, các services khác (Auth, User, GIS, Report, Admin, Search) **chưa được rebuild** với `DATABASE_URL` mới
- Do đó các services này vẫn cố kết nối database qua `localhost:5433` thay vì Docker service names
- Gateway không thể forward requests đến các services bị lỗi này

---

## ✅ Giải pháp (Đã chuẩn bị)

Tôi đã tạo sẵn scripts để fix tất cả vấn đề một lần duy nhất.

---

## 🚀 BƯỚC 1: Chạy Script Fix Toàn Bộ

```powershell
.\fix-all-services.ps1
```

**Script này sẽ:**
1. ✅ Stop tất cả containers
2. ✅ Rebuild TẤT CẢ services với config đúng:
   - DATABASE_URL cho Auth, User, GIS, Report, Admin, Search
   - MAPSERVER_SERVICE_URL cho Gateway
3. ✅ Start databases trước
4. ✅ Đợi databases healthy
5. ✅ Start MapServer
6. ✅ Start tất cả services còn lại
7. ✅ Test tất cả services

**Thời gian**: 10-15 phút

---

## 📊 BƯỚC 2: Kiểm Tra Kết Quả

Script sẽ tự động test tất cả services và hiển thị kết quả:

```
Testing all services...

  [OK] Gateway
  [OK] Auth
  [OK] User
  [OK] GIS
  [OK] Report
  [OK] Admin
  [OK] Search
  [OK] MapServer
  [OK] Frontend

====================================================================
Result: 9 OK, 0 Failed
====================================================================

🎉 ALL SERVICES ARE RUNNING SUCCESSFULLY! 🎉
```

---

## 🌐 BƯỚC 3: Truy Cập Web

Sau khi tất cả services OK, truy cập:

**Local:**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000/health

**Production (Server IP):**
- Frontend: http://103.56.161.239:5173
- API Gateway: http://103.56.161.239:3000/health

**Test login:**
- Username: `admin`
- Password: (password của bạn)

---

## 🔍 Nếu Vẫn Có Lỗi

### Option 1: Xem logs của service bị lỗi

```powershell
docker logs -f dubaomatrung-auth
docker logs -f dubaomatrung-gateway
docker logs -f dubaomatrung-gis
```

### Option 2: Restart service cụ thể

```powershell
docker-compose restart auth-service
docker-compose restart gateway
```

### Option 3: Quick restart tất cả (nhanh hơn rebuild)

```powershell
.\restart-all-services.ps1
```

### Option 4: Check containers status

```powershell
docker ps -a
```

Tất cả containers phải có status **Up** và **healthy**.

---

## 📝 Các Scripts Đã Tạo

### 1. `fix-all-services.ps1` ⭐ KHUYẾN NGHỊ
Full rebuild tất cả services - dùng khi có lỗi

### 2. `restart-all-services.ps1`
Quick restart - dùng khi đã build đúng

### 3. `fix-database-connection.ps1`
Fix database connection issues

### 4. `fix-mapserver.ps1`
Fix MapServer issues

### 5. `TROUBLESHOOTING.md`
Hướng dẫn chi tiết các lỗi thường gặp

---

## 🔧 Thay Đổi Đã Thực Hiện

### 1. `docker-compose.yml`

**Đã thêm DATABASE_URL cho tất cả services:**

```yaml
# Auth Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@postgres:5432/auth_db

# User Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@postgres:5432/auth_db

# GIS Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@postgis:5432/gis_db

# Report Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@postgres:5432/auth_db

# Admin Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@admin-postgis:5432/admin_db

# Search Service
environment:
  - DATABASE_URL=postgresql://postgres:${DB_PASSWORD:-postgres123}@postgres:5432/auth_db
```

**Đã thêm MAPSERVER_SERVICE_URL cho Gateway:**

```yaml
# Gateway
environment:
  - MAPSERVER_SERVICE_URL=http://mapserver-service:3007
depends_on:
  mapserver-service:
    condition: service_started
```

---

## ✨ Sau Khi Fix Xong

Web sẽ hoạt động bình thường với:
- ✅ Login/Logout
- ✅ User management
- ✅ Role & Permissions
- ✅ MapServer (WMS/WFS)
- ✅ GIS layers
- ✅ Reports
- ✅ Search
- ✅ Admin data

---

## 📞 Nếu Cần Hỗ Trợ

1. Chạy: `.\fix-all-services.ps1`
2. Nếu vẫn lỗi, thu thập logs:
   ```powershell
   docker-compose logs > all-logs.txt
   docker ps -a > containers-status.txt
   ```
3. Xem file `TROUBLESHOOTING.md` để biết thêm chi tiết

---

## 🎯 Tóm Tắt

**Vấn đề**: Auth và các services khác trả về 502 Bad Gateway

**Nguyên nhân**: Chưa rebuild với DATABASE_URL mới

**Giải pháp**:
```powershell
.\fix-all-services.ps1
```

**Kết quả mong đợi**: Tất cả 9 services hoạt động bình thường

---

**Good luck! 🚀**
