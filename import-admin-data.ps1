# ===== IMPORT ADMIN_DB DATA =====

param(
    [switch]$Force = $false
)

Write-Host "=== IMPORT DỮ LIỆU ADMIN_DB ===" -ForegroundColor Cyan

# Kiểm tra file SQL có tồn tại
$sqlFile = "docker-init\admin-postgis\admin_db_data_only.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Không tìm thấy file: $sqlFile" -ForegroundColor Red
    Write-Host "Hãy copy file admin_db_data_only.sql vào thư mục docker-init\admin-postgis\" -ForegroundColor Yellow
    exit 1
}

# Hiển thị thông tin file
$fileInfo = Get-Item $sqlFile
Write-Host "[1] Thông tin file SQL:" -ForegroundColor Yellow
Write-Host "  - Đường dẫn: $($fileInfo.FullName)" -ForegroundColor Cyan
Write-Host "  - Kích thước: $([math]::Round($fileInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "  - Ngày tạo: $($fileInfo.CreationTime)" -ForegroundColor Cyan

# Kiểm tra container admin-postgis
Write-Host "`n[2] Kiểm tra container admin-postgis..." -ForegroundColor Yellow
try {
    $containerStatus = docker ps --filter "name=dubaomatrung-admin-postgis" --format "{{.Status}}"
    if ($containerStatus -like "*Up*") {
        Write-Host "  ✅ Container đang chạy: $containerStatus" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Container không chạy, đang khởi động..." -ForegroundColor Red
        docker-compose up -d admin-postgis
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "  ❌ Lỗi kiểm tra container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiểm tra database có tồn tại
Write-Host "`n[3] Kiểm tra database admin_db..." -ForegroundColor Yellow
try {
    $dbExists = docker exec dubaomatrung-admin-postgis psql -U postgres -lqt | Select-String "admin_db"
    if ($dbExists -and -not $Force) {
        Write-Host "  ⚠️  Database admin_db đã tồn tại!" -ForegroundColor Yellow
        $confirm = Read-Host "Bạn có muốn xóa và tạo lại? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "  ❌ Hủy import" -ForegroundColor Red
            exit 1
        }
        $Force = $true
    }
} catch {
    Write-Host "  ⚠️  Không thể kiểm tra database, tiếp tục import..." -ForegroundColor Yellow
}

# Xóa database cũ nếu cần
if ($Force) {
    Write-Host "`n[4] Xóa database cũ..." -ForegroundColor Yellow
    docker exec dubaomatrung-admin-postgis psql -U postgres -c "DROP DATABASE IF EXISTS admin_db;"
    Write-Host "  ✅ Đã xóa database cũ" -ForegroundColor Green
}

# Tạo database mới
Write-Host "`n[5] Tạo database admin_db..." -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -c "CREATE DATABASE admin_db;"
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
Write-Host "  ✅ Đã tạo database với PostGIS extension" -ForegroundColor Green

# Import dữ liệu
Write-Host "`n[6] Import dữ liệu từ file SQL..." -ForegroundColor Yellow
Write-Host "  ⏳ Đang import dữ liệu... (có thể mất vài phút)" -ForegroundColor Cyan

try {
    # Copy file vào container và import chỉ dữ liệu
    docker cp $sqlFile dubaomatrung-admin-postgis:/tmp/admin_db_data_only.sql
    docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /tmp/admin_db_data_only.sql
    docker exec dubaomatrung-admin-postgis rm /tmp/admin_db_data_only.sql
    
    Write-Host "  ✅ Import dữ liệu thành công!" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Lỗi import: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiểm tra kết quả
Write-Host "`n[7] Kiểm tra dữ liệu đã import:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as rows
FROM pg_stat_user_tables 
ORDER BY n_tup_ins DESC 
LIMIT 10;
"

# Kiểm tra bảng laocai_ranhgioihc cụ thể
Write-Host "`n[8] Kiểm tra bảng laocai_ranhgioihc:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "
SELECT 
    COUNT(*) as total_rows,
    COUNT(geom) as rows_with_geometry,
    ST_SRID(geom) as srid
FROM laocai_ranhgioihc
GROUP BY ST_SRID(geom)
LIMIT 1;
" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Bảng laocai_ranhgioihc có dữ liệu" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Bảng laocai_ranhgioihc không tồn tại hoặc trống" -ForegroundColor Yellow
}

Write-Host "`n=== HOÀN THÀNH IMPORT ===" -ForegroundColor Green
Write-Host "Bây giờ hãy chạy: .\fix-mapserver-final.ps1" -ForegroundColor Yellow
