# ===== KIỂM TRA VÀ IMPORT DỮ LIỆU POSTGIS =====

Write-Host "=== KIỂM TRA DỮ LIỆU POSTGIS ===" -ForegroundColor Cyan

# Kiểm tra kết nối PostGIS
Write-Host "`n[1] Kiểm tra kết nối PostGIS..." -ForegroundColor Yellow
try {
    docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT version();"
    Write-Host "  ✅ Kết nối PostGIS thành công" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Không thể kết nối PostGIS: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiểm tra các bảng có sẵn
Write-Host "`n[2] Danh sách các bảng trong database:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
"

# Kiểm tra bảng laocai_ranhgioihc cụ thể
Write-Host "`n[3] Kiểm tra bảng laocai_ranhgioihc:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    COUNT(*) as total_rows,
    COUNT(geom) as rows_with_geometry,
    ST_SRID(geom) as srid,
    ST_GeometryType(geom) as geom_type
FROM laocai_ranhgioihc
GROUP BY ST_SRID(geom), ST_GeometryType(geom)
LIMIT 5;
"

# Kiểm tra cấu trúc bảng
Write-Host "`n[4] Cấu trúc bảng laocai_ranhgioihc:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
\d laocai_ranhgioihc
"

# Kiểm tra một vài dòng dữ liệu mẫu
Write-Host "`n[5] Dữ liệu mẫu (5 dòng đầu):" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    gid,
    ST_AsText(ST_Centroid(geom)) as center_point,
    ST_Area(geom) as area,
    ST_SRID(geom) as srid
FROM laocai_ranhgioihc 
LIMIT 5;
"

# Kiểm tra BBOX của dữ liệu
Write-Host "`n[6] Phạm vi dữ liệu (BBOX):" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    ST_XMin(ST_Extent(geom)) as min_x,
    ST_YMin(ST_Extent(geom)) as min_y,
    ST_XMax(ST_Extent(geom)) as max_x,
    ST_YMax(ST_Extent(geom)) as max_y,
    ST_SRID(geom) as srid
FROM laocai_ranhgioihc;
"

Write-Host "`n=== HOÀN THÀNH KIỂM TRA ===" -ForegroundColor Green
Write-Host "Nếu không có dữ liệu, hãy chạy: .\import-sample-data.ps1" -ForegroundColor Yellow
