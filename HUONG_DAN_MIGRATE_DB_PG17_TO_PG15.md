# Hướng Dẫn Migrate Database từ PostgreSQL 17 sang PostgreSQL 15

## Tổng quan

Khi deploy project lên Windows Server qua Docker, bạn gặp vấn đề:
- **Máy dev**: PostgreSQL 17 (máy local của bạn)
- **Server**: PostgreSQL 15 (trong Docker container)

PostgreSQL 17 có một số tính năng mới không tương thích ngược với PostgreSQL 15, nên cần xử lý khi export/import.

## Các vấn đề compatibility chính

### 1. SET Statements
PostgreSQL 17 thêm nhiều SET statements mới:
```sql
SET default_table_access_method = heap;  -- Không hỗ trợ trong PG15
SET row_security = off;                   -- Không hỗ trợ trong PG15
```

### 2. Extension Schemas
PostgreSQL 17 xử lý schema cho extensions khác:
```sql
-- PG17
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- PG15 (đơn giản hơn)
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. OID References
PostgreSQL 17 đã loại bỏ hoàn toàn OID support:
```sql
-- Không còn hỗ trợ trong PG17, nhưng vẫn có thể xuất hiện trong dump cũ
WITH (oids = true)
WITHOUT OIDS
```

---

## Giải pháp: Scripts tự động

### Script 1: Export từ PostgreSQL 17 (Máy dev)

**File**: `export-admin-db-for-pg15.ps1`

**Cách dùng**:

```powershell
# Export với cấu hình mặc định
.\export-admin-db-for-pg15.ps1

# Export với tham số tùy chỉnh
.\export-admin-db-for-pg15.ps1 `
    -DbHost "localhost" `
    -DbPort 5433 `
    -DbUser "postgres" `
    -DbPassword "4" `
    -DbName "admin_db" `
    -OutputFile "docker-init\admin-postgis\01-admin-db.sql"
```

**Script này sẽ**:
1. ✅ Kiểm tra pg_dump có sẵn
2. ✅ Kết nối database và kiểm tra version
3. ✅ Export với các options tối ưu:
   - `--no-owner`: Không export owner information
   - `--no-acl`: Không export permissions
   - `--inserts`: Dùng INSERT thay vì COPY (an toàn hơn)
   - `--column-inserts`: Include tên cột (dễ debug)
   - `--disable-dollar-quoting`: Không dùng $$ syntax
4. ✅ Tự động xử lý compatibility:
   - Loại bỏ SET statements không tương thích
   - Fix PostGIS extension syntax
   - Loại bỏ OID references
5. ✅ Validate file output

---

### Script 2: Import vào PostgreSQL 15 (Server Windows)

**File**: `import-admin-db-full.ps1`

**Cách dùng**:

```powershell
# Import và xóa database cũ (nếu có) - CHẾ ĐỘ AN TOÀN
.\import-admin-db-full.ps1

# Import và FORCE xóa database cũ (không hỏi)
.\import-admin-db-full.ps1 -Force

# Import với file SQL khác
.\import-admin-db-full.ps1 -SqlFile "path\to\custom.sql"

# Import vào container khác
.\import-admin-db-full.ps1 -ContainerName "my-postgres-container"
```

**Script này sẽ**:
1. ✅ Kiểm tra file SQL có tồn tại
2. ✅ Kiểm tra Docker container đang chạy
3. ✅ Kiểm tra database tồn tại (hỏi có xóa không)
4. ✅ Xử lý thêm compatibility issues:
   - Loại bỏ SET statements không hỗ trợ
   - Thêm SET statements cần thiết
   - Fix PostGIS extensions
   - Loại bỏ OID options
5. ✅ Import với error handling tốt
6. ✅ Hiển thị warnings/errors chi tiết
7. ✅ Validate kết quả import

---

## Quy trình đầy đủ (Step by Step)

### Bước 1: Export từ máy dev (PostgreSQL 17)

Trên máy Windows dev của bạn:

```powershell
# Di chuyển vào thư mục project
cd C:\DuBaoMatRung

# Chạy script export
.\export-admin-db-for-pg15.ps1

# Kết quả: file docker-init\admin-postgis\01-admin-db.sql
```

Bạn sẽ thấy output:
```
=== EXPORT ADMIN_DB (COMPATIBLE WITH POSTGRES 15) ===
[1] Kiem tra pg_dump...
  [OK] pg_dump (PostgreSQL) 17.x
[2] Kiem tra ket noi database...
  [OK] Ket noi thanh cong!
[3] Tao thu muc output...
  [OK] Thu muc da ton tai
[4] Export database...
  [OK] Export thanh cong!
  - Kich thuoc: 15.23 MB
[5] Xu ly compatibility...
  [PROCESS] Loai bo SET statements...
  [PROCESS] Xu ly PostGIS extensions...
[6] Luu file output...
  [OK] File da luu
[7] Kiem tra file output...
  - So bang: 45
  - So dong du lieu: 12340
  [OK] File hop le!
```

### Bước 2: Kiểm tra file SQL (Optional)

```powershell
# Xem 50 dòng đầu
Get-Content docker-init\admin-postgis\01-admin-db.sql -Head 50

# Kiểm tra có lỗi không
Get-Content docker-init\admin-postgis\01-admin-db.sql | Select-String "ERROR"

# Kiểm tra các bảng được tạo
Get-Content docker-init\admin-postgis\01-admin-db.sql | Select-String "CREATE TABLE"
```

### Bước 3: Copy file lên Server

Có nhiều cách:
- **Cách 1**: Git push/pull
- **Cách 2**: Copy qua USB/Network drive
- **Cách 3**: SCP/SFTP

```powershell
# Ví dụ: Push lên Git
git add docker-init/admin-postgis/01-admin-db.sql
git commit -m "Update admin_db dump for PostgreSQL 15"
git push

# Trên server: Pull về
git pull
```

### Bước 4: Import trên Server (PostgreSQL 15 trong Docker)

Trên Windows Server:

```powershell
# Di chuyển vào thư mục project
cd C:\DuBaoMatRung

# Kiểm tra Docker container đang chạy
docker ps | Select-String "admin-postgis"

# Import database (chế độ an toàn - sẽ hỏi trước khi xóa)
.\import-admin-db-full.ps1

# Hoặc Force mode (xóa luôn không hỏi)
.\import-admin-db-full.ps1 -Force
```

Output mong đợi:
```
=== IMPORT ADMIN_DB (POSTGRES 17 -> POSTGRES 15) ===
[1] Kiem tra file SQL...
  [OK] File: 01-admin-db.sql
  - Kich thuoc: 15.23 MB
[2] Kiem tra container...
  [OK] Container dang chay: Up 2 hours
[3] Kiem tra database admin_db...
  [WARNING] Database admin_db da ton tai!
  Ban co muon xoa va tao lai? (y/N): y
  [OK] Da xoa database cu
[4] Xu ly compatibility...
  [PROCESS] Loai bo SET statements...
  [OK] File da xu ly
[5] Import du lieu...
  [PROCESS] Copy file vao container...
  [INFO] PostgreSQL 15.x
  [PROCESS] Dang import du lieu...
  [OK] Import hoan tat!
[6] Kiem tra ket qua...
  Danh sach cac bang: 45 tables
  [OK] Database admin_db da san sang!
```

### Bước 5: Verify kết quả

Kiểm tra trong Docker container:

```powershell
# Connect vào database
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db

# Trong psql:
# Liệt kê tất cả bảng
\dt

# Đếm số record trong một bảng
SELECT COUNT(*) FROM provinces;

# Kiểm tra PostGIS
SELECT PostGIS_Version();

# Thoát
\q
```

---

## Xử lý lỗi thường gặp

### Lỗi 1: "pg_dump not found"

**Nguyên nhân**: Chưa cài PostgreSQL client tools

**Giải pháp**:
```powershell
# Download PostgreSQL installer từ:
# https://www.postgresql.org/download/windows/

# Hoặc dùng Chocolatey
choco install postgresql --version=17.0
```

### Lỗi 2: "connection refused"

**Nguyên nhân**: Database không chạy hoặc sai port/host

**Giải pháp**:
```powershell
# Kiểm tra PostgreSQL đang chạy
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Kiểm tra port
netstat -ano | Select-String "5433"

# Test connection
psql -h localhost -p 5433 -U postgres -d admin_db
```

### Lỗi 3: "ERROR: extension postgis does not exist"

**Nguyên nhân**: Container chưa có PostGIS extension

**Giải pháp**:
```powershell
# Kiểm tra image có PostGIS không
docker exec dubaomatrung-admin-postgis psql -U postgres -c "SELECT * FROM pg_available_extensions WHERE name='postgis';"

# Nếu không có, dùng image postgis/postgis thay vì postgres
# Sửa trong docker-compose.yml:
# image: postgis/postgis:15-3.4
```

### Lỗi 4: "permission denied"

**Nguyên nhân**: User postgres không có quyền

**Giải pháp**:
```powershell
# Grant quyền trong container
docker exec dubaomatrung-admin-postgis psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

### Lỗi 5: File SQL quá lớn, import lâu

**Giải pháp**:

1. **Tăng timeout** trong script:
```powershell
# Sửa trong import-admin-db-full.ps1
Set statement_timeout = 0;  # Đã có sẵn
```

2. **Dùng COPY thay vì INSERT** (nhanh hơn):
```powershell
# Export lại với COPY format
pg_dump -h localhost -p 5433 -U postgres -d admin_db `
    --format=plain `
    --no-owner `
    --no-acl `
    -f docker-init\admin-postgis\01-admin-db.sql
```

3. **Import theo batch**:
```sql
-- Tách file lớn thành nhiều file nhỏ
-- File 1: Schema only
pg_dump --schema-only ...

-- File 2: Data only
pg_dump --data-only ...
```

---

## Best Practices

### 1. Backup trước khi import

```powershell
# Backup database hiện tại trong container
docker exec dubaomatrung-admin-postgis pg_dump -U postgres admin_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### 2. Test trên môi trường dev trước

```powershell
# Tạo container test
docker run --name test-postgres -e POSTGRES_PASSWORD=test -p 5555:5432 -d postgis/postgis:15-3.4

# Import vào container test
.\import-admin-db-full.ps1 -ContainerName test-postgres -DbPassword test

# Nếu OK, mới import vào production
```

### 3. Verify data integrity

```sql
-- So sánh số lượng records
SELECT
    'provinces' as table_name,
    COUNT(*) as count
FROM provinces
UNION ALL
SELECT
    'districts',
    COUNT(*)
FROM districts;

-- Kiểm tra constraints
SELECT
    conname,
    contype
FROM pg_constraint
WHERE conrelid = 'provinces'::regclass;
```

### 4. Monitor import progress

```powershell
# Xem logs real-time
docker logs -f dubaomatrung-admin-postgis

# Kiểm tra kích thước database trong container
docker exec dubaomatrung-admin-postgis psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('admin_db'));"
```

---

## Tổng kết

### Checklist đầy đủ:

- [ ] Cài đặt PostgreSQL client tools (pg_dump, psql)
- [ ] Export database từ máy dev bằng `export-admin-db-for-pg15.ps1`
- [ ] Kiểm tra file SQL được tạo ra
- [ ] Copy file lên server
- [ ] Kiểm tra Docker container đang chạy
- [ ] Backup database hiện tại (nếu có)
- [ ] Import bằng `import-admin-db-full.ps1`
- [ ] Verify data sau khi import
- [ ] Test ứng dụng hoạt động bình thường

### Files quan trọng:

1. **export-admin-db-for-pg15.ps1** - Export từ PG17 tương thích với PG15
2. **import-admin-db-full.ps1** - Import vào PG15 trong Docker
3. **docker-init/admin-postgis/01-admin-db.sql** - File SQL dump

### Liên hệ hỗ trợ:

Nếu gặp vấn đề, check:
1. Docker logs: `docker logs dubaomatrung-admin-postgis`
2. PostgreSQL logs trong container
3. Script output (đã có detailed error messages)

---

**Lưu ý cuối**: Scripts đã được optimize để tự động xử lý hầu hết các vấn đề compatibility. Nếu vẫn gặp lỗi, có thể do:
- Database có custom extensions không có trong PG15
- Database có custom functions dùng syntax mới của PG17
- Network/firewall issues

Trong trường hợp đó, hãy gửi error logs để được hỗ trợ cụ thể!
