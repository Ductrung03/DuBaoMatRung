# ===== IMPORT DỮ LIỆU MẪU CHO MAPSERVER =====

Write-Host "=== IMPORT DỮ LIỆU MẪU ===" -ForegroundColor Cyan

# Tạo dữ liệu mẫu cho bảng laocai_ranhgioihc
Write-Host "`n[1] Tạo dữ liệu mẫu cho laocai_ranhgioihc..." -ForegroundColor Yellow

$sampleData = @"
-- Xóa bảng cũ nếu có
DROP TABLE IF EXISTS laocai_ranhgioihc;

-- Tạo bảng mới
CREATE TABLE laocai_ranhgioihc (
    gid SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(100),
    area NUMERIC,
    geom GEOMETRY(POLYGON, 3857)
);

-- Thêm dữ liệu mẫu (tọa độ Lào Cai)
INSERT INTO laocai_ranhgioihc (name, type, area, geom) VALUES
('Lào Cai City', 'Urban', 1000.5, ST_GeomFromText('POLYGON((11500000 2580000, 11520000 2580000, 11520000 2600000, 11500000 2600000, 11500000 2580000))', 3857)),
('Sa Pa District', 'Tourist', 2500.8, ST_GeomFromText('POLYGON((11480000 2560000, 11500000 2560000, 11500000 2580000, 11480000 2580000, 11480000 2560000))', 3857)),
('Bát Xát District', 'Rural', 1800.3, ST_GeomFromText('POLYGON((11520000 2560000, 11540000 2560000, 11540000 2580000, 11520000 2580000, 11520000 2560000))', 3857)),
('Mường Khương District', 'Border', 2200.7, ST_GeomFromText('POLYGON((11460000 2540000, 11480000 2540000, 11480000 2560000, 11460000 2560000, 11460000 2540000))', 3857)),
('Bảo Thắng District', 'Agricultural', 1950.2, ST_GeomFromText('POLYGON((11540000 2540000, 11560000 2540000, 11560000 2560000, 11540000 2560000, 11540000 2540000))', 3857));

-- Tạo spatial index
CREATE INDEX idx_laocai_ranhgioihc_geom ON laocai_ranhgioihc USING GIST (geom);

-- Cập nhật geometry_columns
SELECT UpdateGeometrySRID('laocai_ranhgioihc', 'geom', 3857);
"@

# Lưu SQL vào file tạm
$sqlFile = "C:\DuBaoMatRung\temp_sample_data.sql"
$sampleData | Out-File -FilePath $sqlFile -Encoding UTF8

# Import vào database
Write-Host "`n[2] Import dữ liệu vào PostGIS..." -ForegroundColor Yellow
try {
    docker exec -i dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /dev/stdin < $sqlFile
    Write-Host "  ✅ Import thành công!" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Lỗi import: $($_.Exception.Message)" -ForegroundColor Red
}

# Xóa file tạm
Remove-Item $sqlFile -ErrorAction SilentlyContinue

# Kiểm tra kết quả
Write-Host "`n[3] Kiểm tra dữ liệu đã import:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    COUNT(*) as total_rows,
    ST_SRID(geom) as srid,
    ST_GeometryType(geom) as geom_type
FROM laocai_ranhgioihc
GROUP BY ST_SRID(geom), ST_GeometryType(geom);
"

# Kiểm tra BBOX
Write-Host "`n[4] Phạm vi dữ liệu (BBOX):" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    ST_XMin(ST_Extent(geom)) as min_x,
    ST_YMin(ST_Extent(geom)) as min_y,
    ST_XMax(ST_Extent(geom)) as max_x,
    ST_YMax(ST_Extent(geom)) as max_y
FROM laocai_ranhgioihc;
"

Write-Host "`n=== HOÀN THÀNH IMPORT ===" -ForegroundColor Green
Write-Host "Bây giờ hãy chạy lại: .\fix-mapserver-final.ps1" -ForegroundColor Yellow
