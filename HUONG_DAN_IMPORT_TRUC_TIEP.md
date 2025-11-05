# Hướng Dẫn Import Database Bằng Phương Pháp Pipe Trực Tiếp

## ⚠️ Tại sao cần phương pháp này?

Khi import file SQL lớn (1.9GB), **docker cp** có thể gây ra:
- ❌ Docker Desktop crash
- ❌ "Bad Gateway" errors
- ❌ WSL unmounting errors
- ❌ Out of disk space trong container

**Giải pháp**: Pipe file trực tiếp vào PostgreSQL qua stdin, **KHÔNG copy file vào container**.

---

## 🚀 Cách Sử Dụng (Trên Windows Server)

### Bước 1: Đảm bảo file SQL đã có trên server

```powershell
# Kiểm tra file tồn tại
cd C:\DuBaoMatRung
dir docker-init\admin-postgis\01-admin-db.sql

# Kết quả mong đợi: File ~1.9GB
```

### Bước 2: Kiểm tra Docker container đang chạy

```powershell
# Xem container status
docker ps | Select-String "admin-postgis"

# Nếu không chạy, start container
docker start dubaomatrung-admin-postgis

# Đợi container healthy (30 giây)
Start-Sleep -Seconds 30
```

### Bước 3: Chạy script import

```powershell
# Cách 1: Import với Force mode (xóa database cũ tự động)
.\import-admin-db-direct.ps1 -Force

# Cách 2: Import với confirmation (hỏi trước khi xóa)
.\import-admin-db-direct.ps1

# Cách 3: Import với tham số tùy chỉnh
.\import-admin-db-direct.ps1 `
    -SqlFile "docker-init\admin-postgis\01-admin-db.sql" `
    -ContainerName "dubaomatrung-admin-postgis" `
    -DbUser "postgres" `
    -DbName "admin_db" `
    -Force
```

---

## 📊 Output Mong Đợi

```
╔══════════════════════════════════════════════════════════════╗
║     IMPORT ADMIN_DB - DIRECT METHOD (PIPE STDIN)            ║
╚══════════════════════════════════════════════════════════════╝

Phuong phap: Pipe file truc tiep vao psql (KHONG copy vao container)
Uu diem: Tranh Docker crash, tiet kiem disk space, nhanh hon

[1/6] Kiem tra file SQL...
  [OK] File ton tai
    - Ten: 01-admin-db.sql
    - Kich thuoc: 1801.89 MB
    - Duong dan: C:\DuBaoMatRung\docker-init\admin-postgis\01-admin-db.sql

[2/6] Kiem tra Docker container...
  [OK] Container dang chay
    - Status: Up 2 hours (healthy)
    - PostgreSQL: PostgreSQL 15.4 on x86_64-pc-linux-musl

[3/6] Xu ly database 'admin_db'...
  [WARNING] Database 'admin_db' da ton tai!
  [ACTION] Xoa database cu (Force mode)...
  [OK] Da xoa database cu
  [ACTION] Tao database 'admin_db'...
  [OK] Database da duoc tao

[4/6] Kiem tra ket noi database...
  [OK] Ket noi thanh cong den database 'admin_db'

[5/6] Import du lieu vao database...
  [INFO] File: 1801.89 MB
  [INFO] Thoi gian uoc tinh: 10-30 phut (tuy cau hinh server)
  [WAIT] Dang import... XIN KIEM NHAN, KHONG NGAT!

  [PROCESS] Dang doc file va pipe vao PostgreSQL...

  [TIME] Thoi gian import: 00:15:32

  [INFO] Co 25 canh bao (thuong la binh thuong):
    - NOTICE: extension "postgis" already exists, skipping
    - NOTICE: relation "users" already exists, skipping
    - NOTICE: ...

  [OK] Import hoan tat!

[6/6] Kiem tra ket qua import...

  Danh sach cac bang:
  [OK] Tim thay 12 bang:
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

  So luong records (mau):
    - users : 150 rows
    - roles : 8 rows
    - permissions : 250 rows

╔══════════════════════════════════════════════════════════════╗
║                IMPORT HOAN TAT THANH CONG!                   ║
╚══════════════════════════════════════════════════════════════╝

Database 'admin_db' da san sang su dung!

De ket noi vao database:
  docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db
```

---

## 🎯 So Sánh: Script Cũ vs Script Mới

### ❌ Script Cũ (import-admin-db-full.ps1)

```powershell
# BƯỚC 1: Copy file vào container (CHẬM, DỄ CRASH)
docker cp 01-admin-db.sql container:/tmp/import.sql  # ← Docker crash ở đây!

# BƯỚC 2: Import từ file trong container
docker exec container psql -f /tmp/import.sql
```

**Vấn đề**:
- File 1.9GB quá lớn, Docker Desktop không xử lý được
- Tốn disk space trong container
- Dễ bị "Bad Gateway", "pipe closed" errors

### ✅ Script Mới (import-admin-db-direct.ps1)

```powershell
# PIPE TRỰC TIẾP - KHÔNG COPY FILE
Get-Content 01-admin-db.sql | docker exec -i container psql
```

**Ưu điểm**:
- ✅ Không copy file vào container
- ✅ Tiết kiệm disk space
- ✅ Tránh Docker crash
- ✅ Nhanh hơn và ổn định hơn
- ✅ Đọc file từng chunk (tránh Out Of Memory)

---

## ⏱️ Thời Gian Import

Tùy vào cấu hình server:

| Cấu hình | Thời gian ước tính |
|----------|-------------------|
| CPU: 2 cores, RAM: 4GB, HDD | 30-45 phút |
| CPU: 4 cores, RAM: 8GB, SSD | 15-25 phút |
| CPU: 8+ cores, RAM: 16GB+, NVMe SSD | 10-15 phút |

**Lưu ý**: KHÔNG ngắt quá trình import!

---

## 🔍 Verify Import Thành Công

### Cách 1: Kiểm tra số bảng

```powershell
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "\dt"
```

**Kết quả mong đợi**: 12 bảng

### Cách 2: Kiểm tra số records

```powershell
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions;
"
```

**Kết quả mong đợi**: Có dữ liệu trong các bảng

### Cách 3: Kết nối vào database

```powershell
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db
```

```sql
-- Trong psql:
\dt                  -- Liệt kê bảng
\d users             -- Xem cấu trúc bảng users
SELECT COUNT(*) FROM users;
\q                   -- Thoát
```

---

## ⚠️ Xử Lý Lỗi

### Lỗi 1: "Container không chạy"

```powershell
# Start container
docker start dubaomatrung-admin-postgis

# Chờ healthy
Start-Sleep -Seconds 30

# Kiểm tra
docker ps | Select-String "admin-postgis"
```

### Lỗi 2: "File không tồn tại"

```powershell
# Kiểm tra đường dẫn file
Get-Item docker-init\admin-postgis\01-admin-db.sql

# Nếu không có, copy file vào đúng vị trí
```

### Lỗi 3: "Permission denied"

```powershell
# Thử với Docker Desktop administrator mode
# Hoặc grant permissions:
docker exec dubaomatrung-admin-postgis psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

### Lỗi 4: Script chạy quá lâu, treo

**Đây là BÌNH THƯỜNG** với file 1.9GB!

Cách kiểm tra tiến trình:

```powershell
# Terminal mới, kiểm tra kích thước database đang tăng
docker exec dubaomatrung-admin-postgis psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('admin_db'));"

# Chạy lại mỗi 2-3 phút, nếu kích thước tăng = đang import
```

### Lỗi 5: "Out Of Memory" trong PowerShell

Script đã được tối ưu để đọc file từng chunk (ReadCount 1000).

Nếu vẫn bị, giảm ReadCount:

```powershell
# Sửa trong script, dòng:
Get-Content -Path $SqlFile -ReadCount 1000

# Thành:
Get-Content -Path $SqlFile -ReadCount 500
```

---

## 🎯 So Với Các Phương Pháp Khác

### Phương pháp 1: Docker CP (Cũ - ❌ FAIL)

```powershell
docker cp file.sql container:/tmp/
docker exec container psql -f /tmp/file.sql
```

**Kết quả**: Docker crash với file 1.9GB

### Phương pháp 2: Pipe trực tiếp (Mới - ✅ OK)

```powershell
Get-Content file.sql | docker exec -i container psql
```

**Kết quả**: Import thành công, ổn định

### Phương pháp 3: Mount volume (Alternative)

```powershell
# Cần restart container với mount
docker run -v C:\data:/data ...
docker exec container psql -f /data/file.sql
```

**Nhược điểm**: Phải restart container, mất thời gian setup

---

## 📋 Checklist Hoàn Chỉnh

Trước khi import:
- [ ] File SQL đã có trên server (1.9GB)
- [ ] Docker container đang chạy và healthy
- [ ] Đủ disk space (tối thiểu 5GB free)
- [ ] Backup database cũ (nếu cần)

Trong khi import:
- [ ] Không ngắt PowerShell session
- [ ] Không shutdown/restart server
- [ ] Có thể mở terminal khác để monitor

Sau khi import:
- [ ] Verify có 12 bảng
- [ ] Verify có dữ liệu (205k+ rows)
- [ ] Test ứng dụng kết nối được
- [ ] Test một vài queries cơ bản

---

## 💡 Tips & Tricks

### Tip 1: Monitor tiến trình import

```powershell
# Terminal 1: Chạy import
.\import-admin-db-direct.ps1 -Force

# Terminal 2: Monitor database size
while ($true) {
    $size = docker exec dubaomatrung-admin-postgis psql -U postgres -t -c "SELECT pg_size_pretty(pg_database_size('admin_db'));"
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Database size: $size"
    Start-Sleep -Seconds 30
}
```

### Tip 2: Backup trước khi import

```powershell
# Backup database hiện tại
docker exec dubaomatrung-admin-postgis pg_dump -U postgres admin_db > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

### Tip 3: Import nhanh hơn (nếu có thể)

Tắt fsync trong PostgreSQL (CHỈ dùng khi import lần đầu):

```powershell
docker exec dubaomatrung-admin-postgis psql -U postgres -c "ALTER SYSTEM SET fsync = off;"
docker restart dubaomatrung-admin-postgis

# Sau khi import xong, BẬT LẠI:
docker exec dubaomatrung-admin-postgis psql -U postgres -c "ALTER SYSTEM SET fsync = on;"
docker restart dubaomatrung-admin-postgis
```

**⚠️ Cảnh báo**: Chỉ dùng trick này khi import lần đầu, KHÔNG dùng trên production!

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. **Kiểm tra logs Docker**:
   ```powershell
   docker logs dubaomatrung-admin-postgis
   ```

2. **Kiểm tra PostgreSQL logs**:
   ```powershell
   docker exec dubaomatrung-admin-postgis cat /var/log/postgresql/*.log
   ```

3. **Retry với script cũ (nếu pipe fail)**:
   ```powershell
   .\import-admin-db-full.ps1 -Force
   ```

---

**Chúc bạn import thành công! 🚀**
