# ⚡ Quick Migration Guide

## 🎯 Yêu Cầu

- **OLD DB:** PostgreSQL trên `172.17.0.1:5432/geodb` (database cũ)
- **NEW DB:** PostgreSQL trên `172.17.0.1:5433` (database mới)
- **User:** postgres
- **Password:** 4

**Lưu ý:**
- `172.17.0.1` = Docker bridge gateway IP
- PostgreSQL chạy trên **host machine**
- Microservices chạy trong **Docker containers**

## 🚀 Chạy Migration Tự Động

```bash
cd microservices/migrations
./run-migration.sh
```

Script sẽ tự động:
1. ✅ Kiểm tra kết nối OLD DB (5432) và NEW DB (5433)
2. ✅ Backup database cũ
3. ✅ Tạo 3 databases mới: auth_db, gis_db, admin_db
4. ✅ Chạy schema migrations (001, 002, 003)
5. ✅ Copy dữ liệu từ OLD sang NEW
6. ✅ Validate và báo cáo

---

## 📋 Hoặc Chạy Từng Bước Thủ Công

### 1. Backup

```bash
PGPASSWORD=4 pg_dump -h 172.17.0.1 -p 5432 -U postgres geodb > backup_geodb.sql
```

### 2. Tạo databases mới

```bash
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres << EOF
CREATE DATABASE auth_db;
CREATE DATABASE gis_db;
CREATE DATABASE admin_db;
\l
EOF
```

### 3. Chạy schemas

```bash
cd microservices/migrations

PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d auth_db -f 001_auth_db.sql
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d gis_db -f 002_gis_db.sql
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d admin_db -f 003_admin_db.sql
```

### 4. Copy data

```bash
# Users
PGPASSWORD=4 pg_dump -h 172.17.0.1 -p 5432 -U postgres -t users --data-only geodb | \
  PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres auth_db

# Mat rung (Note: Disable triggers first to avoid geography cast errors)
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d gis_db \
  -c "ALTER TABLE mat_rung DISABLE TRIGGER set_area_in_hectares;"

PGPASSWORD=4 pg_dump -h 172.17.0.1 -p 5432 -U postgres \
  -t mat_rung -t mat_rung_verification_log -t mat_rung_monthly_summary \
  --data-only geodb | \
  PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres gis_db

PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d gis_db \
  -c "ALTER TABLE mat_rung ENABLE TRIGGER set_area_in_hectares;"

# Admin
PGPASSWORD=4 pg_dump -h 172.17.0.1 -p 5432 -U postgres \
  -t tlaocai_tkk_3lr_cru -t laocai_huyen \
  --data-only geodb | \
  PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres admin_db
```

### 5. Verify

```bash
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d auth_db -c "SELECT COUNT(*) FROM users;"
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d gis_db -c "SELECT COUNT(*) FROM mat_rung;"
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d admin_db -c "SELECT COUNT(*) FROM tlaocai_tkk_3lr_cru;"
```

---

## ⚙️ Cấu Hình Environment

```bash
cd microservices
cp .env.example .env
```

File `.env` đã được cấu hình sẵn:
- NEW DB: `172.17.0.1:5433`
- OLD DB: `172.17.0.1:5432`
- Database names: `auth_db`, `gis_db`, `admin_db`

---

## 🔍 Troubleshooting

### Lỗi: "could not connect to server"

```bash
# Kiểm tra PostgreSQL đang chạy
sudo systemctl status postgresql

# Kiểm tra port đang listen
sudo netstat -tlnp | grep 543
```

### Lỗi: "database does not exist"

```bash
# Kiểm tra databases
PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -l
```

### Lỗi: "PostGIS extension not found"

```bash
# Cài PostGIS
sudo apt install postgresql-15-postgis-3
```

---

## ✅ Kiểm Tra Kết Quả

```bash
# So sánh số lượng records
echo "OLD users:" && PGPASSWORD=4 psql -h 172.17.0.1 -p 5432 -U postgres -d geodb -tc "SELECT COUNT(*) FROM users;"
echo "NEW users:" && PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d auth_db -tc "SELECT COUNT(*) FROM users;"

echo "OLD mat_rung:" && PGPASSWORD=4 psql -h 172.17.0.1 -p 5432 -U postgres -d geodb -tc "SELECT COUNT(*) FROM mat_rung;"
echo "NEW mat_rung:" && PGPASSWORD=4 psql -h 172.17.0.1 -p 5433 -U postgres -d gis_db -tc "SELECT COUNT(*) FROM mat_rung;"
```

Số lượng phải **KHỚP NHAU**!

---

## 📚 Chi Tiết Hơn

Xem file chi tiết: `microservices/MIGRATION_GUIDE.md`
