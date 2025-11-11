# Hướng Dẫn Sửa Lỗi Dropdown

## Vấn Đề

Web application báo lỗi:
```
GET /api/dropdown/huyen 500 (Internal Server Error)
materialized view "mv_huyen" has not been populated
materialized view "mv_churung" has not been populated
```

## Nguyên Nhân

Các **materialized views** trong database `admin_db` (PostGIS) chưa được populate dữ liệu.

Các views này query từ các bảng GIS:
- `mv_huyen` → từ bảng `laocai_ranhgioihc`
- `mv_xa_by_huyen` → từ bảng `laocai_ranhgioihc`
- `mv_churung` → từ bảng `laocai_rg3lr`
- `mv_tieukhu_by_xa` → từ bảng `laocai_rg3lr`
- `mv_khoanh_by_tieukhu` → từ bảng `laocai_rg3lr`

## Giải Pháp

### Cách 1: Refresh Views Hiện Có (Nhanh Nhất)

Nếu database đã có dữ liệu, chỉ cần refresh views:

```powershell
# Trên Windows Server
.\fix-views-windows.ps1
```

Script này sẽ:
1. Kiểm tra container PostgreSQL đang chạy
2. Kiểm tra các bảng nguồn có dữ liệu không
3. Refresh tất cả materialized views
4. Verify views đã có dữ liệu

### Cách 2: Refresh Thủ Công

```powershell
# Kết nối vào container PostgreSQL
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db

# Refresh từng view
REFRESH MATERIALIZED VIEW mv_huyen;
REFRESH MATERIALIZED VIEW mv_xa_by_huyen;
REFRESH MATERIALIZED VIEW mv_churung;
REFRESH MATERIALIZED VIEW mv_tieukhu_by_xa;
REFRESH MATERIALIZED VIEW mv_khoanh_by_tieukhu;

# Kiểm tra dữ liệu
SELECT COUNT(*) FROM mv_huyen;
SELECT * FROM mv_huyen LIMIT 5;
```

### Cách 3: Nếu Views Vẫn Rỗng

Nếu sau khi refresh views vẫn rỗng (0 rows), có nghĩa là **bảng nguồn chưa có dữ liệu**.

Bạn cần import dữ liệu GIS:

```powershell
# Kiểm tra bảng nguồn
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_ranhgioihc;"
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_rg3lr;"
```

Nếu count = 0, bạn cần:
1. Import shapefile (.shp) vào database
2. Sử dụng tools như `shp2pgsql` hoặc QGIS
3. Sau đó chạy lại script refresh views

## Kiểm Tra Kết Quả

Sau khi fix, test các API endpoints:

```powershell
# Test với curl hoặc browser
curl http://localhost:3000/api/dropdown/huyen
curl http://localhost:3000/api/dropdown/xa
curl http://localhost:3000/api/dropdown/churung

# Hoặc test trực tiếp trên web
http://103.56.160.66:5173
```

Response thành công sẽ có dạng:
```json
{
  "success": true,
  "data": [
    {"value": "TP. Lào Cai", "label": "TP. Lào Cai"},
    {"value": "Huyện Bát Xát", "label": "Huyện Bát Xát"},
    ...
  ]
}
```

## Maintenance

### Khi Nào Cần Refresh Views?

Refresh views khi:
- Import dữ liệu mới vào bảng GIS
- Cập nhật dữ liệu trong bảng nguồn
- Sau khi restore database từ backup

### Tự Động Refresh

Bạn có thể tạo scheduled task để tự động refresh views:

```powershell
# Windows Task Scheduler
schtasks /create /tn "Refresh GIS Views" /tr "powershell.exe -File C:\path\to\fix-views-windows.ps1" /sc daily /st 02:00
```

Hoặc thêm vào cronjob (Linux):
```bash
0 2 * * * docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "REFRESH MATERIALIZED VIEW mv_huyen;"
```

## Troubleshooting

### Lỗi: "relation mv_huyen does not exist"

Views chưa được tạo. Chạy SQL dump:
```powershell
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /docker-entrypoint-initdb.d/01-admin-db.sql
```

### Lỗi: "cannot refresh materialized view that has not been populated"

Views được tạo với `WITH NO DATA`. Cần refresh:
```sql
REFRESH MATERIALIZED VIEW mv_huyen;
```

### Views Vẫn Rỗng Sau Refresh

Kiểm tra bảng nguồn:
```sql
-- Kiểm tra dữ liệu
SELECT COUNT(*) FROM laocai_ranhgioihc WHERE huyen IS NOT NULL;
SELECT DISTINCT huyen FROM laocai_ranhgioihc LIMIT 5;
```

Nếu bảng nguồn rỗng, bạn cần import dữ liệu GIS trước.

## Liên Hệ

Nếu vẫn gặp vấn đề, cung cấp thông tin sau:
1. Output của script `fix-views-windows.ps1`
2. Số lượng rows trong bảng nguồn
3. Error message cụ thể từ API
