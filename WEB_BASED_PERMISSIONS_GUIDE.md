# Hướng dẫn Hệ thống Phân quyền Web-based

## Tổng quan

Hệ thống phân quyền mới được thiết kế theo cấu trúc web thực tế, dễ hiểu và dễ quản lý. Thay vì phân quyền theo các action/subject trừu tượng, hệ thống mới phân quyền theo:

- **Trang web** (Pages): Các trang chính trong ứng dụng
- **Chức năng** (Features): Các tính năng trong mỗi trang  
- **Hành động** (Actions): Các hành động cụ thể có thể thực hiện

## Cấu trúc Permissions

### 1. Trang chính (Main Pages)
```
📈 Dự báo mất rừng (forecast)
├── 🤖 Dự báo tự động (forecast.auto)
└── ⚙️ Dự báo tùy biến (forecast.custom)

🗄️ Quản lý dữ liệu (data_management)
├── 👁️ Xem dữ liệu (data_management.view)
├── ✏️ Chỉnh sửa dữ liệu (data_management.edit)
├── 🗑️ Xóa dữ liệu (data_management.delete)
├── ⬇️ Xuất dữ liệu (data_management.export)
└── ⬆️ Nhập dữ liệu (data_management.import)

📊 Báo cáo (reports)
├── 👁️ Xem báo cáo (reports.view)
├── ➕ Tạo báo cáo (reports.create)
├── ⬇️ Xuất báo cáo (reports.export)
└── 📈 Thống kê chi tiết (reports.statistics)

🔍 Phát hiện mất rừng (detection)
├── 👁️ Xem phát hiện (detection.view)
├── ✅ Xác minh (detection.verify)
├── ❌ Từ chối (detection.reject)
└── 🔬 Phân tích (detection.analyze)

👥 Quản lý người dùng (user_management)
├── 👁️ Xem người dùng (user_management.view)
├── 👤➕ Tạo người dùng (user_management.create)
├── ✏️ Sửa người dùng (user_management.edit)
├── 👤➖ Xóa người dùng (user_management.delete)
└── 🛡️ Phân quyền (user_management.assign_roles)

🛡️ Quản lý roles (role_management)
├── 👁️ Xem roles (role_management.view)
├── ➕ Tạo role (role_management.create)
├── ✏️ Sửa role (role_management.edit)
├── 🗑️ Xóa role (role_management.delete)
└── ⚙️ Phân quyền chi tiết (role_management.assign_permissions)
```

## Sử dụng trong Code

### 1. Hook usePermissions()

```jsx
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { 
    menuItems,           // Danh sách trang có thể truy cập
    loading,             // Trạng thái loading
    canAccessPage,       // Function kiểm tra quyền trang
    getPageActions,      // Function lấy actions của trang
    canPerformAction     // Function kiểm tra quyền action
  } = usePermissions();

  // Kiểm tra quyền truy cập trang
  const canViewData = canAccessPage('data_management');
  
  // Lấy actions có thể thực hiện
  const actions = await getPageActions('data_management');
  
  // Kiểm tra quyền thực hiện action
  const canEdit = await canPerformAction('data_management.edit');
};
```

### 2. Component PermissionGate

```jsx
import PermissionGate from '../components/PermissionGate';

// Bảo vệ theo quyền truy cập trang
<PermissionGate 
  pageCode="data_management"
  fallback={<div>Bạn không có quyền truy cập trang này</div>}
>
  <DataManagementPage />
</PermissionGate>

// Bảo vệ theo quyền thực hiện action
<PermissionGate 
  actionCode="data_management.edit"
  fallback={null}
>
  <EditButton />
</PermissionGate>
```

### 3. Component DynamicMenu

```jsx
import DynamicMenu from '../components/DynamicMenu';

// Menu tự động dựa trên permissions
<DynamicMenu />
```

### 4. Component PageActions

```jsx
import PageActions from '../components/PageActions';

// Hiển thị tất cả actions có thể thực hiện trong trang
<PageActions pageCode="data_management" />
```

## API Endpoints

### Frontend API Calls

```javascript
// Lấy menu items cho user hiện tại
GET /api/auth/permissions/menu

// Kiểm tra quyền truy cập trang
GET /api/auth/permissions/check/{pageCode}

// Lấy actions có thể thực hiện trong trang
GET /api/auth/permissions/page/{pageCode}/actions

// Lấy permissions theo category
GET /api/auth/permissions/category/{category}

// Lấy permissions tree (admin)
GET /api/auth/permissions/tree
```

## Quản lý Roles

### Roles mặc định

1. **Admin**: Có tất cả quyền
2. **User**: Chỉ có quyền xem cơ bản

### Tạo Role mới

```sql
-- Tạo role mới
INSERT INTO "Role" (name, description, updated_at) 
VALUES ('Editor', 'Biên tập viên', NOW());

-- Gán quyền cho role
INSERT INTO "RolePermission" (role_id, permission_id)
SELECT 
    (SELECT id FROM "Role" WHERE name = 'Editor'),
    p.id
FROM "Permission" p
WHERE p.code IN (
    'forecast', 'data_management', 'reports',
    'data_management.view', 'data_management.edit',
    'reports.view', 'reports.create'
);
```

## Migration từ hệ thống cũ

Hệ thống mới đã được setup với permissions chuẩn. Để migrate:

1. **Backup dữ liệu cũ** (đã thực hiện)
2. **Chạy migration mới** (đã thực hiện)
3. **Cập nhật frontend** để sử dụng components mới
4. **Test permissions** với các user khác nhau

## Testing

### 1. Test Demo Page

Truy cập `/dashboard/permission-demo` để xem demo đầy đủ các tính năng.

### 2. Test với User khác nhau

```sql
-- Tạo user test
INSERT INTO "User" (username, password_hash, full_name, updated_at)
VALUES ('testuser', '$2b$10$...', 'Test User', NOW());

-- Gán role User (chỉ có quyền xem)
INSERT INTO "UserRole" (user_id, role_id)
VALUES (
    (SELECT id FROM "User" WHERE username = 'testuser'),
    (SELECT id FROM "Role" WHERE name = 'User')
);
```

### 3. Kiểm tra Menu động

- Login với user khác nhau
- Kiểm tra menu hiển thị khác nhau
- Kiểm tra actions khác nhau trong mỗi trang

## Lợi ích của hệ thống mới

1. **Dễ hiểu**: Phân quyền theo cấu trúc web thực tế
2. **Dễ quản lý**: Admin có thể dễ dàng hiểu và cấu hình
3. **Linh hoạt**: Có thể phân quyền chi tiết đến từng action
4. **Tự động**: Menu và UI tự động thay đổi theo permissions
5. **Clean code**: Code frontend sạch và dễ maintain

## Troubleshooting

### 1. Menu không hiển thị

```javascript
// Kiểm tra permissions trong console
const { menuItems } = usePermissions();
console.log('Menu items:', menuItems);
```

### 2. Actions không hoạt động

```javascript
// Kiểm tra actions của trang
const actions = await getPageActions('data_management');
console.log('Page actions:', actions);
```

### 3. Permission Gate không hoạt động

```javascript
// Kiểm tra quyền cụ thể
const hasAccess = await canPerformAction('data_management.edit');
console.log('Has access:', hasAccess);
```

## Kết luận

Hệ thống phân quyền web-based mới giúp:
- Quản lý permissions dễ dàng hơn
- UI/UX tốt hơn với menu và actions động
- Code sạch và dễ maintain
- Phù hợp với cấu trúc web thực tế

Hệ thống đã sẵn sàng sử dụng và có thể mở rộng dễ dàng khi thêm trang/chức năng mới.
