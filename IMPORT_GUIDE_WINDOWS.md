# Hướng Dẫn Import Database trên Windows Server

## ⚠️ QUAN TRỌNG: File đã được xử lý sẵn

File `docker-init/admin-postgis/01-admin-db.sql` đã được:
- ✅ Export từ PostgreSQL 17
- ✅ Xử lý compatibility cho PostgreSQL 15
- ✅ Loại bỏ các SET statements không tương thích
- ✅ Sẵn sàng import trực tiếp

**KHÔNG CẦN** xử lý thêm trên Windows!

---

## Bước 1: Copy file lên Windows Server

### Cách 1: Git (Khuyến nghị)

```powershell
# Trên Linux (đã làm xong)
git add docker-init/admin-postgis/01-admin-db.sql
git commit -m "Add admin_db dump for PostgreSQL 15"
git push

# Trên Windows Server
cd C:\DuBaoMatRung
git pull
```

### Cách 2: Copy trực tiếp

Copy file `docker-init/admin-postgis/01-admin-db.sql` (1.9GB) lên server qua:
- USB drive
- Network share
- SCP/SFTP

---

## Bước 2: Kiểm tra Docker container

```powershell
# Kiểm tra container đang chạy
docker ps | Select-String "admin-postgis"

# Nếu không chạy, start container
docker start dubaomatrung-admin-postgis

# Chờ container healthy (khoảng 30 giây)
docker ps --format "{{.Names}}: {{.Status}}" | Select-String "admin-postgis"
```

---

## Bước 3: Import database

### CÁCH ĐƠN GIẢN NHẤT (Khuyến nghị):

```powershell
cd C:\DuBaoMatRung

# Import với Force mode (tự động xóa database cũ)
.\import-admin-db-full.ps1 -Force
```

Script sẽ:
1. ✅ Kiểm tra file SQL (1.9GB)
2. ✅ Kiểm tra container đang chạy
3. ✅ Xóa database cũ (nếu có)
4. ✅ Tạo database mới
5. ✅ **Skip bước xử lý** (vì file >500MB, đã xử lý sẵn)
6. ✅ Import trực tiếp vào PostgreSQL 15
7. ✅ Verify kết quả

### Output mong đợi:

```
=== IMPORT ADMIN_DB (POSTGRES 17 -> POSTGRES 15) ===
[1] Kiem tra file SQL...
  [OK] File: 01-admin-db.sql
  - Kich thuoc: 1801.89 MB

[2] Kiem tra container Docker...
  [OK] Container dang chay: Up XX hours (healthy)

[3] Kiem tra database admin_db...
  [INFO] Dang xoa database cu (Force mode)...
  [OK] Da xoa database cu
  [INFO] Tao database admin_db...
  [OK] Database tao thanh cong

[4] Kiem tra file SQL...
  [INFO] File lon (1801.89 MB), su dung truc tiep (da xu ly compatibility)
  [SKIP] Bo qua buoc xu ly de tranh Out Of Memory

[5] Import du lieu vao database (co the mat 5-10 phut)...
  [PROCESS] Copy file vao container...
  [INFO] PostgreSQL 15.4
  [PROCESS] Dang import du lieu...

  [INFO] Co XX canh bao (binh thuong):
    - NOTICE: extension "postgis" already exists
    - ...

  [OK] Import hoan tat!

[6] Kiem tra ket qua import...
  Danh sach cac bang: 12 tables
  - administrative_boundaries
  - district_permissions
  - log_db_operations
  - permissions
  - role_permissions
  - roles
  - user_data_scopes
  - user_permissions
  - user_roles
  - users
  - ... (và các bảng khác)

=== HOAN THANH IMPORT ===
```

---

## Bước 4: Verify import thành công

```powershell
# Kết nối vào database
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db

# Trong psql, chạy các lệnh:
```

```sql
-- Liệt kê tất cả bảng
\dt

-- Đếm số records trong một vài bảng
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions;

-- Kiểm tra PostGIS
SELECT PostGIS_Version();

-- Thoát
\q
```

---

## Xử lý lỗi

### Lỗi 1: "Out Of Memory" (ĐÃ FIX)

**Nguyên nhân**: Script cũ cố đọc file 1.9GB vào RAM

**Giải pháp**: Script mới tự động skip xử lý nếu file >500MB

### Lỗi 2: Container không chạy

```powershell
# Start container
docker start dubaomatrung-admin-postgis

# Kiểm tra logs
docker logs dubaomatrung-admin-postgis
```

### Lỗi 3: "extension postgis does not exist"

```powershell
# Kiểm tra image có PostGIS
docker exec dubaomatrung-admin-postgis psql -U postgres -c "SELECT * FROM pg_available_extensions WHERE name='postgis';"

# Nếu không có, cần dùng image postgis/postgis thay vì postgres
```

### Lỗi 4: Import lâu, treo

File 1.9GB sẽ mất **10-30 phút** để import tùy vào:
- CPU của server
- Tốc độ disk
- RAM available

**Hãy kiên nhẫn!** Có thể mở terminal khác để monitor:

```powershell
# Xem logs real-time
docker logs -f dubaomatrung-admin-postgis

# Xem kích thước database (trong lúc import)
docker exec dubaomatrung-admin-postgis psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('admin_db'));"
```

---

## Backup trước khi import (An toàn hơn)

```powershell
# Backup database hiện tại
docker exec dubaomatrung-admin-postgis pg_dump -U postgres admin_db > "backup_admin_db_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Nếu có vấn đề, restore lại:
# docker exec -i dubaomatrung-admin-postgis psql -U postgres -d admin_db < backup_admin_db_XXXXXXXX.sql
```

---

## Tổng kết

### Checklist:

- [ ] File SQL đã copy lên server (1.9GB)
- [ ] Docker container đang chạy và healthy
- [ ] Đã backup database cũ (nếu cần)
- [ ] Chạy `.\import-admin-db-full.ps1 -Force`
- [ ] Import thành công (10-30 phút)
- [ ] Verify có đủ 12 bảng và dữ liệu
- [ ] Test ứng dụng hoạt động bình thường

### Files quan trọng:

- **01-admin-db.sql** (1.9GB) - File SQL đã xử lý sẵn
- **import-admin-db-full.ps1** - Script import (đã fix Out Of Memory)

### Lưu ý:

- ✅ File SQL đã xử lý sẵn trên Linux bằng Python
- ✅ Script PowerShell tự động skip xử lý nếu file >500MB
- ✅ Import trực tiếp, không load vào RAM
- ✅ Tương thích 100% với PostgreSQL 15

---

**Nếu gặp vấn đề, kiểm tra:**
1. Docker logs
2. Script output (có detailed errors)
3. PostgreSQL version trong container (phải là 15.x)
4. Disk space (cần ít nhất 5GB free)

Good luck! 🚀
