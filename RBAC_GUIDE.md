# Role-Based Access Control (RBAC) Guide

## Tổng quan

Hệ thống sử dụng RBAC với Prisma để quản lý phân quyền người dùng một cách linh hoạt.

## Kiến trúc

```
User (Người dùng)
  ├─> Roles (Vai trò) - Many-to-Many
      ├─> Permissions (Quyền) - Many-to-Many
```

### 3 Roles mặc định

1. **Admin** - Quản trị viên
   - Có tất cả quyền trong hệ thống
   - Permission: `manage:all`

2. **GIS Specialist** - Chuyên viên GIS
   - Có quyền đọc, tạo, cập nhật, xác minh sự kiện mất rừng
   - Có quyền xem báo cáo
   - Không có quyền quản lý người dùng

3. **Viewer** - Người xem
   - Chỉ có quyền xem (read) tất cả dữ liệu
   - Không có quyền chỉnh sửa hoặc tạo mới

## Sử dụng trong Backend

### Login Response

Khi user đăng nhập thành công, API trả về:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "System Administrator",
    "is_active": true,
    "roles": [
      {
        "id": 1,
        "name": "admin",
        "description": "Administrator with full access",
        "permissions": [
          {
            "id": 1,
            "action": "manage",
            "subject": "all",
            "description": "Full system access"
          },
          // ... more permissions
        ]
      }
    ]
  }
}
```

### JWT Token Payload

Token chứa thông tin:

```javascript
{
  id: 1,
  username: "admin",
  full_name: "System Administrator",
  roles: ["admin"],
  permissions: [
    "manage:all",
    "read:users",
    "create:users",
    // ...
  ]
}
```

## Sử dụng trong Frontend

### 1. Kiểm tra vai trò trong component

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAdmin, hasPermission } = useAuth();

  return (
    <div>
      {/* Hiển thị cho tất cả users */}
      <h1>Welcome {user?.full_name}</h1>

      {/* Chỉ hiển thị cho admin */}
      {isAdmin() && (
        <button>Quản lý người dùng</button>
      )}

      {/* Kiểm tra permission cụ thể */}
      {hasPermission('create', 'deforestation_events') && (
        <button>Tạo sự kiện mất rừng</button>
      )}

      {hasPermission('verify', 'deforestation_events') && (
        <button>Xác minh sự kiện</button>
      )}
    </div>
  );
}
```

### 2. Bảo vệ routes

```jsx
import ProtectedRoute from './components/ProtectedRoute';

// Route chỉ cho admin
<Route path="/admin/*" element={
  <ProtectedRoute adminOnly={true}>
    <AdminPanel />
  </ProtectedRoute>
} />

// Route yêu cầu permission cụ thể
<Route path="/users/create" element={
  <ProtectedRoute requiredPermission={{ action: 'create', subject: 'users' }}>
    <CreateUser />
  </ProtectedRoute>
} />
```

### 3. Sử dụng Permission Gates

```jsx
import { PermissionGate, AdminOnly } from './components/UserRoleDisplay';

function DataPanel() {
  return (
    <div>
      {/* Hiển thị chỉ cho admin */}
      <AdminOnly>
        <button>Delete All Data</button>
      </AdminOnly>

      {/* Hiển thị khi có permission */}
      <PermissionGate action="update" subject="deforestation_events">
        <button>Cập nhật</button>
      </PermissionGate>

      {/* Với fallback */}
      <PermissionGate
        action="delete"
        subject="users"
        fallback={<span className="text-gray-400">Bạn không có quyền xóa</span>}
      >
        <button>Xóa người dùng</button>
      </PermissionGate>
    </div>
  );
}
```

### 4. Hiển thị thông tin user

```jsx
import UserRoleDisplay from './components/UserRoleDisplay';

// Compact mode (trong header)
<UserRoleDisplay compact={true} />

// Full mode (trong profile page)
<UserRoleDisplay />
```

## Quản lý Roles và Permissions

### Tạo Role mới

```javascript
// Backend - trong auth-service
const newRole = await prisma.role.create({
  data: {
    name: 'district_manager',
    description: 'Quản lý cấp huyện'
  }
});
```

### Gán Permission cho Role

```javascript
await prisma.role.update({
  where: { id: roleId },
  data: {
    permissions: {
      connect: [
        { id: permissionId1 },
        { id: permissionId2 }
      ]
    }
  }
});
```

### Gán Role cho User

```javascript
await prisma.user.update({
  where: { id: userId },
  data: {
    roles: {
      connect: [{ id: roleId }]
    }
  }
});
```

## Permission Format

Permission được định nghĩa theo format: `action:subject`

### Actions (Hành động)

- `manage` - Quản lý toàn bộ (admin)
- `read` - Xem
- `create` - Tạo mới
- `update` - Cập nhật
- `delete` - Xóa
- `verify` - Xác minh

### Subjects (Đối tượng)

- `all` - Tất cả
- `users` - Người dùng
- `deforestation_events` - Sự kiện mất rừng
- `reports` - Báo cáo

### Ví dụ Permissions

- `manage:all` - Quản lý toàn bộ hệ thống (Admin)
- `read:users` - Xem danh sách người dùng
- `create:deforestation_events` - Tạo sự kiện mất rừng mới
- `verify:deforestation_events` - Xác minh sự kiện mất rừng
- `delete:users` - Xóa người dùng

## Testing Accounts

### Admin
```
Username: admin
Password: Admin@123#
Permissions: Tất cả
```

### GIS Specialist
```
Username: gis_user
Password: Gis@123#
Permissions:
  - read:deforestation_events
  - create:deforestation_events
  - update:deforestation_events
  - verify:deforestation_events
  - read:reports
```

### Viewer
```
Username: viewer
Password: Viewer@123#
Permissions:
  - read:users
  - read:deforestation_events
  - read:reports
```

## API Endpoints

### Auth Endpoints

```
POST /api/auth/login           - Đăng nhập
POST /api/auth/logout          - Đăng xuất
GET  /api/auth/me              - Lấy thông tin user hiện tại
POST /api/auth/refresh-token   - Refresh JWT token
```

### Role Management (Admin only)

```
GET    /api/auth/roles              - Danh sách roles
POST   /api/auth/roles              - Tạo role mới
PUT    /api/auth/roles/:id          - Cập nhật role
DELETE /api/auth/roles/:id          - Xóa role
POST   /api/auth/roles/:id/permissions - Gán permissions cho role
```

### Permission Management (Admin only)

```
GET    /api/auth/permissions        - Danh sách permissions
POST   /api/auth/permissions        - Tạo permission mới
PUT    /api/auth/permissions/:id    - Cập nhật permission
DELETE /api/auth/permissions/:id    - Xóa permission
```

### User Management

```
GET    /api/auth/users              - Danh sách users (admin)
POST   /api/auth/users              - Tạo user (admin)
PUT    /api/auth/users/:id          - Cập nhật user (admin hoặc chính user đó)
DELETE /api/auth/users/:id          - Xóa user (admin)
POST   /api/auth/users/:id/roles    - Gán roles cho user (admin)
```

## Database Seeding

Để tạo lại test data:

```bash
cd microservices/services/auth-service
npm run prisma:seed
```

Script này sẽ tạo:
- 3 roles (admin, gis_specialist, viewer)
- 11 permissions
- 3 test users với mật khẩu đã hash

## Best Practices

1. **Luôn kiểm tra permission ở cả frontend và backend**
   - Frontend: UX tốt hơn, ẩn các nút không có quyền
   - Backend: Bảo mật thực sự, không thể bypass

2. **Sử dụng permission granular (chi tiết)**
   - Thay vì check `isAdmin()`, check permission cụ thể
   - Ví dụ: `hasPermission('delete', 'users')` thay vì `isAdmin()`

3. **Cache permission checks trong component**
   - Tránh gọi `hasPermission()` nhiều lần không cần thiết

4. **Luôn có fallback UI cho người dùng không có quyền**
   - Hiển thị message thân thiện
   - Đề xuất liên hệ admin nếu cần quyền

5. **Test với tất cả các roles**
   - Login với admin, gis_specialist, viewer
   - Verify UI hiển thị đúng với từng role

## Troubleshooting

### User không thấy roles/permissions

1. Kiểm tra response từ API `/api/auth/me`
2. Verify user có roles trong database
3. Check browser console cho errors
4. Clear localStorage và login lại

### Permission check không hoạt động

1. Verify `hasPermission` được import từ AuthContext
2. Check format permission (action:subject)
3. Verify roles có đúng permissions trong database

### Admin không có full access

1. Check role admin có permission `manage:all`
2. Verify `isAdmin()` function check đúng `roles.some(r => r.name === 'admin')`
3. Reseed database nếu cần

## Security Notes

- JWT tokens expire sau 24h
- Passwords được hash với bcrypt (10 rounds)
- Sensitive data không được trả về trong API response
- Token được lưu trong localStorage (consider httpOnly cookies cho production)
- Always validate permissions on backend, never trust frontend checks alone

## Migration từ hệ thống cũ

Nếu bạn có user data từ hệ thống cũ:

1. Export users từ database cũ
2. Map role cũ sang role mới:
   - `permission_level: 2` → `admin` role
   - `permission_level: 1` → `gis_specialist` role
   - `permission_level: 0` → `viewer` role
3. Run migration script để import vào Prisma
4. Update JWT tokens với roles mới

## Future Enhancements

- [ ] Role hierarchy (inherit permissions)
- [ ] Time-based permissions (temporary access)
- [ ] Resource-level permissions (per-district access)
- [ ] Permission groups/presets
- [ ] Audit log for permission changes
- [ ] Two-factor authentication for admin
