#!/bin/bash

# Script để setup hệ thống phân quyền mới theo trang và chức năng

echo "🚀 Bắt đầu setup hệ thống phân quyền mới..."

# Kiểm tra xem có trong thư mục dự án không
if [ ! -f "package.json" ]; then
    echo "❌ Vui lòng chạy script từ thư mục gốc của dự án"
    exit 1
fi

# Chuyển đến thư mục auth-service
cd microservices/services/auth-service

echo "📁 Đang ở thư mục: $(pwd)"

# Kiểm tra xem file seed có tồn tại không
if [ ! -f "src/scripts/seed-page-permissions.js" ]; then
    echo "❌ Không tìm thấy file seed-page-permissions.js"
    exit 1
fi

# Chạy seed permissions
echo "🌱 Đang seed permissions mới..."
node src/scripts/seed-page-permissions.js

if [ $? -eq 0 ]; then
    echo "✅ Seed permissions thành công!"
else
    echo "❌ Seed permissions thất bại!"
    exit 1
fi

# Quay lại thư mục gốc
cd ../../..

echo "📝 Cập nhật routes trong auth-service..."

# Kiểm tra xem routes đã được thêm chưa
AUTH_ROUTES_FILE="microservices/services/auth-service/src/app.js"

if [ -f "$AUTH_ROUTES_FILE" ]; then
    # Kiểm tra xem route đã được thêm chưa
    if ! grep -q "pagePermissionRoutes" "$AUTH_ROUTES_FILE"; then
        echo "➕ Thêm routes mới vào auth-service..."
        
        # Backup file gốc
        cp "$AUTH_ROUTES_FILE" "$AUTH_ROUTES_FILE.backup"
        
        # Thêm import và route (cần chỉnh sửa thủ công)
        echo "⚠️  Cần thêm thủ công vào $AUTH_ROUTES_FILE:"
        echo "   const pagePermissionRoutes = require('./routes/pagePermissionRoutes');"
        echo "   app.use('/api/auth/page-permissions', pagePermissionRoutes);"
    else
        echo "✅ Routes đã được thêm trước đó"
    fi
else
    echo "⚠️  Không tìm thấy file app.js của auth-service"
fi

echo ""
echo "🎉 Setup hoàn tất!"
echo ""
echo "📋 Các bước tiếp theo:"
echo "1. Khởi động lại auth-service"
echo "2. Cập nhật frontend để sử dụng components mới:"
echo "   - Thay thế useFeaturePermissions bằng useFeaturePermissionsNew"
echo "   - Sử dụng SidebarNew thay cho Sidebar cũ"
echo "   - Sử dụng QuanLyRoleNew thay cho QuanLyRole cũ"
echo "   - Sử dụng PermissionGuardNew cho các trang cần bảo vệ"
echo ""
echo "3. Test hệ thống phân quyền mới:"
echo "   - Đăng nhập với các role khác nhau"
echo "   - Kiểm tra sidebar chỉ hiển thị trang được phép"
echo "   - Kiểm tra chức năng trong trang theo permissions"
echo ""
echo "📚 Tài liệu:"
echo "   - Cấu trúc permissions: microservices/services/auth-service/src/data/page-permissions.js"
echo "   - API mới: /api/auth/page-permissions/*"
echo "   - Components mới: client/src/components/PermissionGuardNew.jsx"
echo ""

# Hiển thị thống kê
echo "📊 Thống kê hệ thống mới:"
echo "   - 6 trang chính"
echo "   - 15+ chức năng con"
echo "   - 3 role mẫu (Admin, Người xem, Chuyên viên dự báo, Quản lý dữ liệu)"
echo "   - Phân quyền chi tiết theo từng chức năng"
echo ""

echo "✨ Chúc bạn thành công!"
