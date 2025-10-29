# Hệ thống Phân quyền Modern - Theo Trang/Chức năng

## Tổng quan

Đã modernize hệ thống phân quyền từ cấu trúc **module-resource-action** cũ sang **page-based permissions** mới, giúp:

✅ **Dễ quản lý hơn**: Phân quyền theo trang và chức năng cụ thể
✅ **UI hiện đại**: Search, filter, tree view với animations
✅ **Trực quan**: Sử dụng icons và badges để hiển thị trạng thái
✅ **Responsive**: Hoạt động tốt trên mọi thiết bị

## Các thay đổi chính

### 1. Database Schema
**Thêm trường mới vào bảng `Permission`:**
- `ui_category` (TEXT): Danh mục hiển thị trên UI (vd: "Trang chính", "Báo cáo")
- Đã có sẵn: `ui_path`, `icon`, `order`

### 2. Cấu trúc Permissions mới

**11 nhóm trang chính** với **70 permissions**:

1. **Dashboard** (2 quyền)
   - Xem Dashboard
   - Xem thống kê tổng quan

2. **Dự báo mất rừng** (3 quyền)
   - Xem dự báo
   - Xem bản đồ dự báo
   - Xuất dữ liệu dự báo

3. **Phát hiện mất rừng** (7 quyền)
   - Xem/Thêm/Sửa/Xóa điểm phát hiện
   - Xem/Phê duyệt/Từ chối xác minh

4. **Quản lý dữ liệu GIS** (7 quyền)
   - CRUD layers
   - Upload/Process shapefile
   - Export dữ liệu

5. **Báo cáo & Thống kê** (9 quyền)
   - CRUD báo cáo
   - Export/Publish báo cáo
   - Xem/Xuất thống kê

6. **Tìm kiếm** (3 quyền)
   - Tìm kiếm cơ bản/nâng cao
   - Xuất kết quả

7. **Quản lý người dùng** (10 quyền)
   - CRUD users
   - Activate/Deactivate
   - Export users
   - View/Update profile

8. **Quản lý vai trò** (10 quyền)
   - CRUD roles
   - Assign/Revoke roles
   - Manage permissions

9. **Xác thực** (6 quyền)
   - Login/Logout
   - Change/Reset password
   - Token management

10. **Quản trị hệ thống** (10 quyền)
    - System config
    - Logs management
    - Backup/Restore
    - Audit logs

11. **Phạm vi dữ liệu** (3 quyền)
    - View/Assign/Revoke data scopes

### 3. API Endpoints

#### Mới
```
GET /api/auth/roles/permissions/ui-tree
```
Trả về permissions nhóm theo trang với cấu trúc:
```json
{
  "success": true,
  "data": [
    {
      "key": "dashboard",
      "name": "Dashboard",
      "icon": "FaHome",
      "path": "/dashboard",
      "description": "Trang tổng quan hệ thống",
      "permissions": [
        {
          "id": 67,
          "code": "dashboard.view",
          "name": "Xem Dashboard",
          "description": "...",
          "icon": "FaEye",
          "action": "view",
          "usageCount": 0
        }
      ],
      "totalPermissions": 2
    }
  ]
}
```

#### Legacy (vẫn hoạt động)
```
GET /api/auth/roles/permissions/tree
```
Trả về permissions theo module-resource-action

### 4. UI Component Mới: QuanLyRoleModern

**Tính năng:**
- ✅ **Search bar**: Tìm kiếm quyền theo tên, mô tả hoặc tên trang
- ✅ **Stats badge**: Hiển thị số quyền đã chọn real-time
- ✅ **Select All/Deselect All**: Nút chọn/bỏ chọn tất cả
- ✅ **Page-based tree**: Collapsible sections cho từng trang
- ✅ **Visual feedback**:
  - Checkboxes với animation
  - Color coding (green cho đã chọn)
  - Icons cho mỗi trang và quyền
- ✅ **Progress indicators**: Hiển thị X/Y quyền đã chọn
- ✅ **Modern design**: Gradient backgrounds, shadows, hover effects
- ✅ **Responsive**: Grid layout tự động điều chỉnh theo màn hình

**UI Flow:**
1. Click vào card Role → Click "Phân quyền"
2. Modal hiện lên với search bar và stats
3. Expand/collapse từng trang để xem quyền
4. Click vào permission cards để chọn/bỏ chọn
5. Hoặc dùng "Chọn tất cả" ở page level hoặc global level
6. Click "Lưu quyền hạn" để sync permissions

## Files đã thay đổi/tạo mới

### Backend
1. **`prisma/schema.prisma`**
   - Thêm `ui_category` vào model Permission

2. **`prisma/migrations/20251028153526_add_ui_fields_to_permissions/`**
   - Migration thêm trường ui_category

3. **`src/config/ui-permissions.js`** (MỚI)
   - Định nghĩa cấu trúc 11 trang với 70 permissions
   - Helper functions: `getAllPermissions()`, `getPermissionsByPages()`, `getPageInfo()`

4. **`prisma/seed-ui-permissions.js`** (MỚI)
   - Script seed permissions với UI metadata
   - Tự động create/update permissions

5. **`src/controllers/role.controller.js`**
   - Thêm method `getUIPermissionTree()`
   - Giữ nguyên `getPermissionTree()` cho backward compatibility

6. **`src/routes/role.routes.js`**
   - Thêm route: `GET /permissions/ui-tree`

### Frontend
1. **`client/src/dashboard/pages/QuanLyRoleModern.jsx`** (MỚI)
   - Component mới với modern UI
   - Sử dụng endpoint `/permissions/ui-tree`
   - Search, filter, tree view
   - 800+ lines of React code

2. **`client/src/App.jsx`**
   - Import `QuanLyRoleModern` thay vì `QuanLyRole`
   - Route `/dashboard/quanlyrole` giờ dùng component mới

## Hướng dẫn chạy và test

### 1. Backend Setup
```bash
cd microservices/services/auth-service

# Run migration
npx prisma migrate dev

# Seed permissions (nếu chưa)
node prisma/seed-ui-permissions.js

# Start service
npm run dev
```

### 2. Frontend Setup
```bash
cd client

# Install dependencies (nếu cần)
npm install

# Start dev server
npm run dev
```

### 3. Test Flow

1. **Login** với tài khoản admin
2. **Navigate** đến `/dashboard/quanlyrole`
3. **Test các tính năng:**

   **a) Xem danh sách roles:**
   - Thấy grid cards với stats (số quyền, số users)
   - Icons và badges cho system roles

   **b) Phân quyền:**
   - Click "Phân quyền" trên một role
   - Modal hiện với search bar và tree
   - Test search: gõ "xem", "báo cáo", etc.
   - Expand/collapse pages
   - Select/deselect permissions
   - Check real-time stats update
   - Click "Chọn tất cả" per page
   - Click "Chọn tất cả" global
   - Save và verify

   **c) CRUD roles:**
   - Thêm role mới
   - Edit role (chỉ non-system)
   - Delete role (chỉ non-system, chưa có users)

### 4. API Testing
```bash
# Get UI permission tree
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/roles/permissions/ui-tree | jq

# Compare with legacy tree
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/roles/permissions/tree | jq
```

## Ưu điểm của cấu trúc mới

### Trước (Module-Resource-Action)
```
❌ auth
   ├── login (execute, verify)
   ├── logout (execute)
   └── password (change, reset)
```
- Khó hiểu cho end-users
- Không biết quyền nào dùng ở đâu
- Phải hiểu technical structure

### Sau (Page-based)
```
✅ Dashboard
   ├── 📊 Xem Dashboard
   └── 📈 Xem thống kê tổng quan

✅ Báo cáo & Thống kê
   ├── 👁️ Xem báo cáo
   ├── ➕ Tạo báo cáo
   ├── ✏️ Cập nhật báo cáo
   └── 📥 Xuất báo cáo
```
- Trực quan, dễ hiểu
- Biết ngay quyền nào cho trang nào
- End-users không cần hiểu kỹ thuật

## Tương thích ngược

✅ **API cũ vẫn hoạt động:**
- `GET /api/auth/roles/permissions/tree` - Legacy endpoint
- Component `QuanLyRole.jsx` cũ vẫn có thể dùng nếu cần

✅ **Database:**
- Permissions cũ được update với metadata mới
- Không mất dữ liệu
- Backward compatible

## Mở rộng trong tương lai

### 1. Thêm trang mới
Edit `src/config/ui-permissions.js`:
```javascript
'ten-trang-moi': {
  name: 'Tên trang mới',
  icon: 'FaIconName',
  path: '/dashboard/tentrangmoi',
  description: 'Mô tả trang',
  permissions: [
    {
      code: 'module.resource.action',
      name: 'Tên quyền',
      // ...
    }
  ]
}
```

Chạy lại seed:
```bash
node prisma/seed-ui-permissions.js
```

### 2. Permission Hierarchy
Có thể mở rộng với parent-child relationships:
- Parent permission: "Quản lý báo cáo"
- Children: "Tạo", "Sửa", "Xóa", "Xuất"

Schema đã có `parent_id` sẵn.

### 3. Dynamic Permissions
Có thể tạo permissions động từ database:
- Admin tự định nghĩa permissions mới
- UI tự động generate form

### 4. Role Templates
Tạo sẵn templates cho roles phổ biến:
- "Quản lý tỉnh" → pre-select quyền thường dùng
- "Nhân viên xem" → chỉ quyền view

### 5. Audit Log
Track permission changes:
- Ai gán quyền gì cho role nào
- Khi nào
- Lý do (optional)

## Troubleshooting

### Issue: UI không hiển thị permissions
**Solution:**
```bash
# Check API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/roles/permissions/ui-tree

# Reseed if needed
node prisma/seed-ui-permissions.js
```

### Issue: Permission count không đúng
**Solution:**
```sql
-- Check database
SELECT COUNT(*) FROM "Permission" WHERE is_active = true;

-- Check by category
SELECT ui_category, COUNT(*)
FROM "Permission"
WHERE is_active = true
GROUP BY ui_category;
```

### Issue: Search không hoạt động
**Check:** Đảm bảo searchQuery được bind đúng và filter logic works
**Debug:** Console.log `filteredPages` trong component

## Kết luận

✨ **Hệ thống phân quyền hiện đại, dễ dùng, trực quan!**

- **70 permissions** organized across **11 pages**
- **Modern UI** với search, filter, tree view
- **Backward compatible** với hệ thống cũ
- **Extensible** - dễ mở rộng trong tương lai

**Next Steps:**
1. Test thoroughly với nhiều roles khác nhau
2. Gather user feedback
3. Iterate on UX improvements
4. Consider adding role templates
5. Add audit logging cho permission changes

---

**Created:** 2025-10-28
**Version:** 1.0.0
**Author:** Claude Code Assistant
