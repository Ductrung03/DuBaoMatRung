#!/bin/bash
# ===== EXPORT ADMIN_DB DATA =====

echo "=== XUẤT DỮ LIỆU ADMIN_DB ==="

# Tạo thư mục docker-init nếu chưa có
mkdir -p docker-init/admin-postgis

# Export chỉ dữ liệu (không export cấu trúc bảng)
echo "[1] Đang export dữ liệu admin_db..."
docker exec QuanLyMatRungPostgres17 pg_dump -U postgres -d admin_db \
  --data-only \
  --no-owner \
  --no-privileges \
  --format=plain \
  --encoding=UTF8 \
  > docker-init/admin-postgis/admin_db_data_only.sql

# Kiểm tra kết quả
if [ -f "docker-init/admin-postgis/admin_db_data_only.sql" ]; then
    file_size=$(du -h docker-init/admin-postgis/admin_db_data_only.sql | cut -f1)
    echo "✅ Export thành công: admin_db_data_only.sql ($file_size)"
    
    # Hiển thị thông tin file
    echo "[2] Thông tin file:"
    echo "  - Đường dẫn: $(pwd)/docker-init/admin-postgis/admin_db_data_only.sql"
    echo "  - Kích thước: $file_size"
    echo "  - Số dòng: $(wc -l < docker-init/admin-postgis/admin_db_data_only.sql)"
    
    # Hiển thị vài dòng đầu để kiểm tra
    echo "[3] Nội dung đầu file:"
    head -20 docker-init/admin-postgis/admin_db_data_only.sql
    
else
    echo "❌ Export thất bại!"
    exit 1
fi

echo ""
echo "=== HOÀN THÀNH ==="
echo "File đã được lưu tại: docker-init/admin-postgis/admin_db_data_only.sql"
echo "Hãy copy file này sang Windows server và chạy import-admin-data.ps1"
