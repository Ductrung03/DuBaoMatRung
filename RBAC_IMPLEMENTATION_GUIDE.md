# Hướng dẫn sử dụng Hệ thống phân quyền động (Dynamic RBAC)

## Tổng quan

Hệ thống RBAC (Role-Based Access Control) động cho phép quản lý quyền truy cập linh hoạt với:
- **66 permissions** được tổ chức theo 8 modules
- **7 roles mặc định** từ super_admin đến viewer
- **Data scopes** cho phép giới hạn phạm vi dữ liệu theo địa lý
- **Permission caching** để tối ưu hiệu năng
- **Pattern matching** hỗ trợ wildcard permissions

## Cấu trúc Permissions

### Format
```
module.resource.action
```

Ví dụ:
- `user.user.view` - Xem danh sách người dùng
- `gis.layer.create` - Tạo layer bản đồ
- `report.report.export` - Xuất báo cáo

### Modules

1. **auth** - Xác thực (6 permissions)
2. **user** - Quản lý người dùng (10 permissions)
3. **role** - Quản lý vai trò (10 permissions)
4. **gis** - Quản lý bản đồ GIS (14 permissions)
5. **report** - Quản lý báo cáo (10 permissions)
6. **search** - Tìm kiếm (3 permissions)
7. **admin** - Quản trị hệ thống (10 permissions)
8. **datascope** - Phạm vi dữ liệu (3 permissions)

## Roles mặc định

| Role | Mô tả | Số permissions |
|------|-------|----------------|
| super_admin | Toàn quyền hệ thống | 66 (tất cả) |
| admin | Quản trị viên | 49 |
| gis_manager | Quản lý GIS | 21 |
| gis_specialist | Chuyên viên GIS | 11 |
| verifier | Người xác minh | 10 |
| reporter | Người báo cáo | 17 |
| viewer | Người xem | 6 |

## Sử dụng trong Code

### 1. Auth Service - Kiểm tra permissions trực tiếp

```javascript
const { requirePermission, requireRole } = require('../middleware/permission.middleware');

// Kiểm tra 1 permission
router.get('/users',
  requirePermission('user.user.view'),
  userController.getAll
);

// Kiểm tra nhiều permissions (ANY - có 1 trong các quyền)
router.post('/users',
  requirePermission(['user.user.create', 'admin.system.update']),
  userController.create
);

// Kiểm tra nhiều permissions (ALL - phải có tất cả)
router.delete('/users/:id',
  requirePermission(['user.user.delete', 'admin.system.update'], 'all'),
  userController.delete
);

// Sử dụng wildcard pattern
router.get('/admin/*',
  requirePermission('admin.*', 'pattern'),
  adminController.handleRequest
);

// Kiểm tra role
router.get('/admin/dashboard',
  requireRole(['admin', 'super_admin']),
  adminController.dashboard
);
```

### 2. Gateway - Middleware RBAC

```javascript
const { authenticate, requirePermission } = require('./middleware/rbac');

// Áp dụng authentication cho toàn bộ routes
app.use('/api', authenticate);

// Bảo vệ specific routes
app.use('/api/users',
  requirePermission('user.user.view'),
  proxy('http://localhost:3002')
);

// Multiple permissions
app.use('/api/gis/layers/edit',
  requirePermission(['gis.layer.update', 'gis.layer.delete']),
  proxy('http://localhost:3003')
);

// Pattern matching
app.use('/api/admin',
  requirePermission('admin.*', 'pattern'),
  proxy('http://localhost:3004')
);
```

### 3. Trong Controllers - Kiểm tra động

```javascript
const rbacService = require('../services/rbac.service');

// Kiểm tra permission trong logic
async function updateUser(req, res) {
  const userId = req.user.id;

  // Kiểm tra quyền
  const canUpdate = await rbacService.hasPermission(userId, 'user.user.update');

  if (!canUpdate) {
    return res.status(403).json({ message: 'Không có quyền' });
  }

  // Logic xử lý...
}

// Kiểm tra nhiều quyền
async function complexAction(req, res) {
  const userId = req.user.id;

  // Kiểm tra có ít nhất 1 trong các quyền
  const canDo = await rbacService.hasAnyPermission(userId, [
    'gis.layer.update',
    'gis.matrung.update'
  ]);

  if (!canDo) {
    return res.status(403).json({ message: 'Không có quyền' });
  }
}

// Kiểm tra pattern
async function adminAction(req, res) {
  const userId = req.user.id;

  const isAdmin = await rbacService.hasPermissionPattern(userId, 'admin.*');

  if (!isAdmin) {
    return res.status(403).json({ message: 'Cần quyền admin' });
  }
}
```

## API Endpoints

### Role Management

```bash
# Lấy tất cả roles
GET /api/auth/roles

# Lấy role theo ID
GET /api/auth/roles/:id

# Tạo role mới
POST /api/auth/roles
Body: {
  "name": "district_manager",
  "description": "Quản lý cấp huyện",
  "permissions": [1, 2, 3, 4],  # Permission IDs
  "dataScopes": [10, 11]         # Data scope IDs
}

# Cập nhật role
PATCH /api/auth/roles/:id
Body: {
  "name": "new_name",
  "description": "New description"
}

# Xóa role
DELETE /api/auth/roles/:id

# Gán permissions cho role
POST /api/auth/roles/:roleId/permissions
Body: {
  "permissionIds": [1, 2, 3, 4, 5]
}

# Đồng bộ permissions (thay thế toàn bộ)
PUT /api/auth/roles/:roleId/permissions
Body: {
  "permissionIds": [1, 2, 3]
}

# Xóa permission khỏi role
DELETE /api/auth/roles/:roleId/permissions/:permissionId

# Lấy permission tree (grouped by module)
GET /api/auth/roles/permissions/tree
```

### Permission Management

```bash
# Lấy tất cả permissions
GET /api/auth/permissions

# Lấy permission theo ID
GET /api/auth/permissions/:id

# Lấy permissions theo module
GET /api/auth/permissions?module=gis

# Tạo permission mới (chỉ super_admin)
POST /api/auth/permissions
Body: {
  "code": "custom.action.execute",
  "name": "Thực hiện action tùy chỉnh",
  "module": "custom",
  "resource": "action",
  "action": "execute",
  "description": "Mô tả chi tiết"
}
```

### User Role Assignment

```bash
# Gán role cho user
POST /api/auth/users/:userId/roles
Body: {
  "roleId": 3
}

# Xóa role khỏi user
DELETE /api/auth/users/:userId/roles/:roleId

# Lấy roles của user
GET /api/auth/users/:userId/roles
```

## RBAC Service Methods

```javascript
const rbacService = require('../services/rbac.service');

// Lấy permissions của user
const permissions = await rbacService.getUserPermissions(userId);
// => [{id, code, name, module, resource, action}, ...]

// Lấy roles của user
const roles = await rbacService.getUserRoles(userId);
// => [{id, name, description, is_system}, ...]

// Kiểm tra 1 permission
const can = await rbacService.hasPermission(userId, 'user.user.view');
// => true/false

// Kiểm tra nhiều permissions (ANY)
const canAny = await rbacService.hasAnyPermission(userId, [
  'user.user.view',
  'user.user.create'
]);
// => true/false

// Kiểm tra nhiều permissions (ALL)
const canAll = await rbacService.hasAllPermissions(userId, [
  'user.user.view',
  'user.user.update'
]);
// => true/false

// Kiểm tra pattern
const isAdmin = await rbacService.hasPermissionPattern(userId, 'admin.*');
// => true/false

// Lấy data scopes
const scopes = await rbacService.getUserDataScopes(userId);
// => [{id, code, name, type, level, path}, ...]

// Clear cache (sau khi thay đổi permissions)
rbacService.clearUserCache(userId);
rbacService.clearAllCache();

// Lấy permission tree cho UI
const tree = await rbacService.getPermissionTree();
// => { module: { resources: { actions: [...] } } }
```

## Performance & Caching

Hệ thống sử dụng cache tự động với TTL 5 phút:

- User permissions được cache khi lần đầu query
- Cache tự động refresh sau 5 phút
- Cache tự động clear khi:
  - Gán/thu hồi role cho user
  - Thay đổi permissions của role
  - Gọi clearUserCache() hoặc clearAllCache()

## Migration & Seeding

```bash
# Generate Prisma client
npx prisma generate

# Run migration
npx prisma migrate deploy

# Seed database với 66 permissions và 7 roles
node prisma/seed.js
```

## Testing

```bash
# Login với admin account
POST /api/auth/login
Body: {
  "username": "admin",
  "password": "Admin@123"
}

# Kiểm tra permissions trong token
# Token JWT sẽ chứa: { id, username, roles, permissions }

# Test permission check
GET /api/users
Header: Authorization: Bearer <token>
# => Sẽ kiểm tra quyền 'user.user.view'
```

## Best Practices

1. **Sử dụng pattern matching cho module-level permissions**
   ```javascript
   // Thay vì check từng permission
   requirePermission(['gis.layer.view', 'gis.layer.create', 'gis.layer.update'])

   // Sử dụng pattern
   requirePermission('gis.layer.*', 'pattern')
   ```

2. **Cache management**
   - Clear cache sau khi thay đổi roles/permissions
   - Không clear cache quá thường xuyên (ảnh hưởng performance)

3. **Permission naming convention**
   - Module: lowercase, mô tả chức năng chính (user, gis, report)
   - Resource: singular noun (layer, report, user)
   - Action: verb (view, create, update, delete, export)

4. **Role hierarchy**
   - System roles (is_system=true) không được xóa/sửa
   - Super admin luôn có tất cả quyền
   - Sử dụng role inheritance thông qua permission assignment

## Troubleshooting

### Permission không hoạt động
- Kiểm tra user có role không: `rbacService.getUserRoles(userId)`
- Kiểm tra role có permission không: `GET /api/auth/roles/:id`
- Clear cache: `rbacService.clearUserCache(userId)`

### Performance chậm
- Check cache hit rate trong logs
- Tăng TTL nếu permissions ít thay đổi
- Sử dụng pattern matching thay vì check nhiều permissions

### Migration error
- Reset database: `npx prisma migrate reset --force`
- Re-run seed: `node prisma/seed.js`

## Liên hệ & Support

- Xem log: `auth-service/logs/`
- Debug: Set `LOG_LEVEL=debug` trong `.env`
