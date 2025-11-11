# Quick Checks - Dropdown Issues

## Các Script Kiểm Tra

### 1. Kiểm tra trạng thái views và bảng nguồn
```powershell
.\check-views-status.ps1
```
Hiển thị số lượng rows trong mỗi view và bảng nguồn.

### 2. Test các API endpoints
```powershell
.\test-api-endpoints.ps1
```
Thử gọi các API endpoint dropdown và hiển thị kết quả.

### 3. Fix views (nếu cần)
```powershell
.\fix-views-windows.ps1
```
Refresh tất cả materialized views.

## Kiểm Tra Thủ Công

### Kiểm tra views trong database
```powershell
docker exec -it dubaomatrung-admin-postgis psql -U postgres -d admin_db
```

Trong PostgreSQL:
```sql
-- Kiểm tra số lượng rows
SELECT 'mv_huyen' as view, COUNT(*) FROM mv_huyen
UNION ALL
SELECT 'mv_xa_by_huyen', COUNT(*) FROM mv_xa_by_huyen
UNION ALL
SELECT 'mv_churung', COUNT(*) FROM mv_churung;

-- Xem dữ liệu mẫu
SELECT * FROM mv_huyen LIMIT 5;
SELECT * FROM mv_xa_by_huyen LIMIT 5;
SELECT * FROM mv_churung LIMIT 5;

-- Kiểm tra bảng nguồn
SELECT COUNT(*) FROM laocai_ranhgioihc;
SELECT COUNT(*) FROM laocai_rg3lr;

-- Thoát
\q
```

### Test API trực tiếp với curl
```powershell
# Test Huyen endpoint
curl http://localhost:3000/api/dropdown/huyen

# Test Xa endpoint
curl http://localhost:3000/api/dropdown/xa

# Test Chu Rung endpoint
curl http://localhost:3000/api/dropdown/churung
```

### Kiểm tra logs của services
```powershell
# Admin service logs (handles dropdown APIs)
docker logs dubaomatrung-admin --tail 50

# Gateway logs
docker logs dubaomatrung-gateway --tail 50

# Database logs
docker logs dubaomatrung-admin-postgis --tail 50
```

## Kết Quả Mong Đợi

### Views có dữ liệu:
```
mv_huyen: 9 rows (9 huyện ở Lào Cai)
mv_xa_by_huyen: 150+ rows (xã/phường/thị trấn)
mv_churung: 10-20 rows (các loại chủ rừng)
```

### API Response thành công:
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

### Browser không còn lỗi:
- Console không hiển thị lỗi 500
- Dropdown hiển thị danh sách đầy đủ
- Có thể chọn huyện, xã, chủ rừng

## Troubleshooting Quick Checks

### Views rỗng (0 rows)?
→ Bảng nguồn chưa có dữ liệu → Cần import shapefile

### API trả về 500?
→ View chưa được populate → Chạy `.\fix-views-windows.ps1`

### API trả về 401/403?
→ Vấn đề authentication → Check token hoặc permissions

### Container không chạy?
→ Start containers: `docker-compose up -d`

## Các Bảng Nguồn Cần Có Dữ Liệu

- **laocai_ranhgioihc** - Ranh giới hành chính (administrative boundaries)
  - Chứa thông tin về huyện, xã
  - Cần có ít nhất vài trăm rows (xã/phường/thị trấn)

- **laocai_rg3lr** - Dữ liệu rừng (forest data)
  - Chứa thông tin về chủ rừng, tiểu khu, khoảnh
  - Có thể rỗng nếu chưa import dữ liệu rừng

## File Import Cần Có

Để dropdowns hoạt động đầy đủ, cần import các shapefile:
- `laocai_ranhgioihc.shp` - Ranh giới hành chính
- `laocai_rg3lr.shp` - Dữ liệu quy hoạch rừng 3 loại rừng

Import bằng QGIS hoặc `shp2pgsql`:
```bash
shp2pgsql -s 4326 -I laocai_ranhgioihc.shp laocai_ranhgioihc | psql -h localhost -U postgres -d admin_db
```

Sau khi import, chạy lại:
```powershell
.\fix-views-windows.ps1
```
