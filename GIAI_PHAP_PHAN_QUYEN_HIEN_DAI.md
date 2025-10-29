# Giải pháp Phân quyền Hiện đại - Modern Permission System

## 📌 Tổng quan

Đây là giải pháp hoàn chỉnh để nâng cấp hệ thống phân quyền của bạn từ mô hình cũ (khó sử dụng, không trực quan) sang mô hình hiện đại (dễ dùng, modern UI, tổ chức theo trang/chức năng).

---

## 🎯 Vấn đề đã giải quyết

### Vấn đề cũ:
- ❌ UI phân quyền khó sử dụng, không trực quan
- ❌ Không tổ chức theo cấu trúc trang → chức năng rõ ràng
- ❌ Khó biết quyền nào ảnh hưởng đến nút bấm/tính năng nào
- ❌ Thiếu tính thẩm mỹ, giao diện cũ kỹ
- ❌ Khó thêm chức năng mới vào hệ thống

### Giải pháp mới:
- ✅ UI hiện đại với card-based design, gradient headers
- ✅ Tổ chức theo cấu trúc: Module → Page → Feature → Permissions
- ✅ Mỗi permission rõ ràng áp dụng cho UI element nào
- ✅ Dễ dàng chọn/bỏ chọn theo nhóm (Module/Page/Feature)
- ✅ Quy trình thêm chức năng mới đơn giản, tài liệu rõ ràng
- ✅ Responsive, mobile-friendly
- ✅ Icon đẹp mắt, màu sắc phân biệt rõ ràng

---

## 📁 Cấu trúc File mới

### Backend
```
microservices/services/auth-service/
├── src/
│   ├── config/
│   │   └── modern-permissions.config.js  ← ⭐ Config chính (permissions definition)
│   ├── controllers/
│   │   └── permission.controller.js       ← Thêm endpoint /modern-tree
│   └── routes/
│       └── permission.routes.js           ← Thêm route /modern-tree
└── prisma/
    └── seed-modern.js                     ← ⭐ Seed file mới
```

### Frontend
```
client/src/
└── dashboard/
    └── pages/
        └── QuanLyRoleUltraModern.jsx      ← ⭐ UI component mới
```

### Documentation
```
/
├── GIAI_PHAP_PHAN_QUYEN_HIEN_DAI.md       ← File này (tổng quan)
└── HUONG_DAN_THEM_CHUC_NANG_MOI.md        ← ⭐ Hướng dẫn chi tiết
```

---

## 🏗️ Kiến trúc Hệ thống

### Cấu trúc Phân quyền

```
Module (ví dụ: user, gis, report, admin)
  └── Page (ví dụ: management, layers, statistics)
      └── Feature (ví dụ: list, actions, export)
          └── Permissions (ví dụ: view, create, edit, delete)
```

**Ví dụ cụ thể:**

```
user (Quản lý người dùng)
  └── management (Danh sách người dùng)
      ├── list (Danh sách)
      │   ├── user.management.list.view (Xem danh sách)
      │   ├── user.management.list.search (Tìm kiếm)
      │   └── user.management.list.filter (Lọc)
      ├── actions (Thao tác)
      │   ├── user.management.actions.create (Thêm người dùng)
      │   ├── user.management.actions.edit (Sửa thông tin)
      │   └── user.management.actions.delete (Xóa người dùng)
      └── export (Xuất dữ liệu)
          ├── user.management.export.excel (Xuất Excel)
          └── user.management.export.pdf (Xuất PDF)
```

---

## 📦 Các Module có sẵn

Hệ thống đã được config sẵn 9 modules chính:

| Module | Tên | Icon | Số trang | Mô tả |
|--------|-----|------|----------|-------|
| `dashboard` | Dashboard | FaHome | 1 | Tổng quan hệ thống, thống kê |
| `user` | Quản lý người dùng | FaUsers | 2 | Quản lý người dùng, hồ sơ cá nhân |
| `role` | Vai trò & Phân quyền | FaUserShield | 1 | Quản lý vai trò, gán quyền, phạm vi dữ liệu |
| `gis` | Hệ thống GIS | FaMap | 4 | Lớp bản đồ, mất rừng, xác minh, shapefile |
| `report` | Báo cáo | FaFileAlt | 2 | Quản lý báo cáo, thống kê |
| `search` | Tìm kiếm | FaSearch | 1 | Tìm kiếm cơ bản, nâng cao |
| `admin` | Quản trị | FaCog | 4 | Hệ thống, logs, backup, audit |
| `auth` | Xác thực | FaKey | 4 | Đăng nhập, đăng xuất, mật khẩu, token |

**Tổng cộng:** ~140+ permissions được định nghĩa sẵn!

---

## 🚀 Hướng dẫn Cài đặt & Sử dụng

### Bước 1: Chạy Seed để Import Permissions

```bash
# Di chuyển vào thư mục auth-service
cd microservices/services/auth-service

# Chạy seed file
node prisma/seed-modern.js
```

**Output mong đợi:**
```
🌱 Starting modern permissions seeding...

📊 Total permissions to seed: 142

✓ Created: dashboard.overview.statistics.view
✓ Created: dashboard.overview.statistics.export
✓ Created: user.management.list.view
...
✓ Created: admin.audit.export.report

📈 Summary:
  ✅ Created: 142
  🔄 Updated: 0
  ❌ Failed: 0
  📊 Total: 142

📦 Permissions by module:
  admin               : 18 permissions
  auth                : 8 permissions
  dashboard           : 3 permissions
  gis                 : 24 permissions
  report              : 15 permissions
  role                : 12 permissions
  search              : 6 permissions
  user                : 16 permissions

✅ Modern permissions seeding completed!
```

### Bước 2: Cập nhật Route trong Frontend

**File:** `client/src/App.jsx` hoặc nơi định nghĩa routes

```jsx
import QuanLyRoleUltraModern from './dashboard/pages/QuanLyRoleUltraModern';

// Thêm route mới
<Route path="/roles-modern" element={<QuanLyRoleUltraModern />} />
```

### Bước 3: Truy cập UI mới

```
http://localhost:5173/roles-modern
```

hoặc thay thế route cũ `/roles` bằng component mới:

```jsx
<Route path="/roles" element={<QuanLyRoleUltraModern />} />
```

---

## 💡 Tính năng UI Mới

### 1. Card-based Role Display
- Hiển thị vai trò dạng cards với gradient header
- Hover effect: Card nổi lên khi hover
- Thông tin rõ ràng: Tên, mô tả, số quyền, số người dùng
- Badge: Vai trò hệ thống, trạng thái hoạt động

### 2. Modern Permission Tree
- **4 cấp độ:** Module → Page → Feature → Permissions
- **Expand/Collapse:** Click để mở rộng/thu gọn
- **Chọn nhiều cấp độ:**
  - Click tên Module → Chọn tất cả quyền trong module
  - Click tên Page → Chọn tất cả quyền trong trang
  - Click tên Feature → Chọn tất cả quyền trong chức năng
  - Click checkbox → Chọn quyền cụ thể

### 3. Visual Feedback
- **Progress indicator:** Hiển thị số quyền đã chọn/tổng số
- **Color coding:**
  - Module: Gradient backgrounds
  - Fully selected: Green button
  - Partially selected: Warning button
  - Not selected: Outline button
- **Checkbox states:**
  - Checked: Quyền được chọn
  - Unchecked: Quyền chưa chọn
  - Background highlight: Quyền đã chọn có màu nền xanh nhạt

### 4. Search & Filter
- Tìm kiếm vai trò theo tên
- Lọc permissions theo module
- Responsive design

### 5. Permission Details
- **Code:** `user.management.list.view`
- **Name:** Xem danh sách người dùng
- **Description:** Hiển thị bảng danh sách người dùng
- **UI Element:** User Table

→ Rõ ràng permission này áp dụng cho cái gì!

---

## 📝 Hướng dẫn Thêm Chức năng Mới

Chi tiết đầy đủ trong file: **`HUONG_DAN_THEM_CHUC_NANG_MOI.md`**

### Quy trình ngắn gọn:

1. **Cập nhật config**
   ```javascript
   // File: modern-permissions.config.js

   notification: {
     name: 'Hệ thống thông báo',
     icon: 'FaBell',
     color: '#FF5722',
     pages: {
       management: {
         name: 'Quản lý thông báo',
         path: '/notifications',
         icon: 'FaBell',
         features: {
           list: {
             name: 'Danh sách',
             permissions: [
               {
                 code: 'notification.management.list.view',
                 name: 'Xem danh sách thông báo',
                 description: 'Hiển thị danh sách thông báo',
                 ui_element: 'Notifications Table'
               }
             ]
           }
         }
       }
     }
   }
   ```

2. **Chạy seed**
   ```bash
   node prisma/seed-modern.js
   ```

3. **Sử dụng trong Frontend**
   ```jsx
   <PermissionGuard permission="notification.management.list.view">
     <NotificationList />
   </PermissionGuard>
   ```

4. **Bảo vệ API**
   ```javascript
   router.get(
     '/notifications',
     requirePermission('notification.management.list.view'),
     notificationController.getAll
   );
   ```

---

## 🔐 Sử dụng Permissions trong Code

### Frontend - React

#### 1. Sử dụng PermissionGuard Component

```jsx
import PermissionGuard from '@/components/PermissionGuard';

// Ẩn/hiện button
<PermissionGuard permission="user.management.actions.create">
  <button onClick={handleCreate}>Thêm người dùng</button>
</PermissionGuard>

// Nhiều permissions (OR logic)
<PermissionGuard
  permissions={['user.management.actions.edit', 'user.management.actions.delete']}
>
  <UserActions />
</PermissionGuard>

// Nhiều permissions (AND logic)
<PermissionGuard
  permissions={['user.management.list.view', 'user.management.detail.view']}
  requireAll={true}
>
  <UserDetailButton />
</PermissionGuard>
```

#### 2. Sử dụng usePermission Hook

```jsx
import { usePermission } from '@/hooks/usePermission';

function UserManagement() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  const canCreate = hasPermission('user.management.actions.create');
  const canEdit = hasPermission('user.management.actions.edit');
  const canDelete = hasPermission('user.management.actions.delete');

  const canManage = hasAnyPermission([
    'user.management.actions.edit',
    'user.management.actions.delete'
  ]);

  return (
    <div>
      {canCreate && <button onClick={handleCreate}>Thêm</button>}
      {canEdit && <button onClick={handleEdit}>Sửa</button>}
      {canDelete && <button onClick={handleDelete}>Xóa</button>}

      {!canManage && <div>Bạn không có quyền quản lý người dùng</div>}
    </div>
  );
}
```

### Backend - Node.js

#### 1. Middleware Protection

```javascript
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/permission.middleware');

// Single permission
router.get(
  '/users',
  requirePermission('user.management.list.view'),
  userController.getAll
);

// Multiple permissions (OR logic)
router.post(
  '/users',
  requirePermission(['user.management.actions.create', 'user.admin']),
  userController.create
);

// Multiple permissions (AND logic)
router.patch(
  '/users/:id',
  requirePermission(['user.management.list.view', 'user.management.actions.edit'], 'all'),
  userController.update
);

// Pattern matching (wildcard)
router.get(
  '/admin/logs',
  requirePermission('admin.*', 'pattern'),
  adminController.getLogs
);
```

#### 2. Programmatic Check

```javascript
const rbacService = require('../services/rbac.service');

async function someFunction(userId) {
  // Check single permission
  const canExport = await rbacService.hasPermission(
    userId,
    'user.management.export.excel'
  );

  if (!canExport) {
    throw new ForbiddenError('Bạn không có quyền xuất dữ liệu');
  }

  // Check multiple permissions (OR)
  const canManage = await rbacService.hasAnyPermission(
    userId,
    ['user.management.actions.create', 'user.management.actions.edit']
  );

  // Check multiple permissions (AND)
  const canApprove = await rbacService.hasAllPermissions(
    userId,
    ['gis.verification.list.view', 'gis.verification.actions.approve']
  );

  // Pattern matching
  const isAdmin = await rbacService.hasPermissionPattern(userId, 'admin.*');
}
```

---

## 🎨 Tùy chỉnh UI

### Thay đổi màu sắc Module

**File:** `modern-permissions.config.js`

```javascript
gis: {
  name: 'Hệ thống bản đồ GIS',
  icon: 'FaMap',
  color: '#3B82F6',  // ← Thay đổi màu ở đây
  pages: { ... }
}
```

### Thêm Icon mới

**File:** `QuanLyRoleUltraModern.jsx`

```jsx
import { FaBell, FaNewIcon } from 'react-icons/fa';

const ICON_MAP = {
  // ... existing icons
  FaBell,
  FaNewIcon
};
```

Sau đó trong config:

```javascript
notification: {
  icon: 'FaNewIcon',  // Sử dụng icon mới
  // ...
}
```

### Custom CSS

Component sử dụng Bootstrap 5 và inline styles. Bạn có thể:

1. **Override Bootstrap classes:**
   ```css
   .card {
     border-radius: 16px !important;
   }
   ```

2. **Add custom classes:**
   ```jsx
   <div className="custom-role-card">
     {/* ... */}
   </div>
   ```

---

## 📊 Database Schema

Permissions được lưu trong bảng `Permission`:

```sql
CREATE TABLE "Permission" (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES "Permission"(id),
  ui_path VARCHAR(255),
  ui_category VARCHAR(100),
  ui_element VARCHAR(255),
  icon VARCHAR(100),
  "order" INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_permission_module_resource_action
ON "Permission" (module, resource, action);
```

**Ý nghĩa các trường:**
- `code`: Mã định danh duy nhất (ví dụ: `user.management.list.view`)
- `name`: Tên hiển thị
- `description`: Mô tả chi tiết
- `module`, `resource`, `action`: Phân cấp permissions
- `ui_path`: Đường dẫn trang trong UI
- `ui_category`: Category để nhóm trong UI
- `ui_element`: Phần tử UI áp dụng permission
- `icon`: Icon hiển thị
- `order`: Thứ tự sắp xếp
- `is_active`: Trạng thái hoạt động

---

## 🔍 API Endpoints

### 1. Get Modern Permissions Tree

**Endpoint:** `GET /api/auth/permissions/modern-tree`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "name": "Quản lý người dùng",
      "icon": "FaUsers",
      "color": "#10B981",
      "pages": {
        "management": {
          "name": "Danh sách người dùng",
          "path": "/users",
          "icon": "FaUsersCog",
          "features": {
            "list": {
              "name": "Danh sách",
              "permissions": [
                {
                  "id": 1,
                  "code": "user.management.list.view",
                  "name": "Xem danh sách người dùng",
                  "description": "Hiển thị bảng danh sách người dùng",
                  "ui_element": "User Table",
                  "module": "user",
                  "resource": "management.list",
                  "action": "view"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### 2. Get All Roles with Permissions

**Endpoint:** `GET /api/auth/roles`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin",
      "description": "Administrator role",
      "is_system": true,
      "is_active": true,
      "_count": {
        "rolePermissions": 45,
        "userRoles": 3
      }
    }
  ]
}
```

### 3. Get Role Permissions

**Endpoint:** `GET /api/auth/roles/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Admin",
    "permissions": [
      {
        "id": 1,
        "code": "user.management.list.view",
        "name": "Xem danh sách người dùng"
      }
    ]
  }
}
```

### 4. Assign Permissions to Role

**Endpoint:** `POST /api/auth/roles/:id/permissions`

**Request Body:**
```json
{
  "permissionIds": [1, 2, 3, 5, 8, 13]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions assigned successfully"
}
```

---

## 🧪 Testing

### Test Backend

```bash
# Test API endpoint
curl http://localhost:3001/api/auth/permissions/modern-tree

# Test với authorization
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/auth/permissions/modern-tree
```

### Test Frontend

1. Đăng nhập vào hệ thống
2. Truy cập `/roles-modern`
3. Chọn một vai trò → Click "Phân quyền"
4. Kiểm tra:
   - ✅ Permissions tree hiển thị đúng
   - ✅ Expand/collapse hoạt động
   - ✅ Chọn module/page/feature/permission hoạt động
   - ✅ Progress indicator hiển thị đúng
   - ✅ Lưu permissions thành công

### Test Permission Check

```jsx
// Create test component
function PermissionTest() {
  const { hasPermission } = usePermission();

  useEffect(() => {
    console.log('=== Permission Tests ===');
    console.log('Can view users:', hasPermission('user.management.list.view'));
    console.log('Can create users:', hasPermission('user.management.actions.create'));
    console.log('Can delete users:', hasPermission('user.management.actions.delete'));
    console.log('Can export excel:', hasPermission('user.management.export.excel'));
  }, [hasPermission]);

  return <div>Check console for results</div>;
}
```

---

## 🐛 Troubleshooting

### Vấn đề 1: Permissions không hiển thị trong UI

**Nguyên nhân:**
- Chưa chạy seed
- Permission có `is_active = false`
- API endpoint trả về lỗi

**Giải pháp:**
```bash
# Chạy lại seed
node prisma/seed-modern.js

# Kiểm tra database
psql -U postgres -d your_database -c "SELECT COUNT(*) FROM \"Permission\" WHERE is_active = true;"

# Kiểm tra API
curl http://localhost:3001/api/auth/permissions/modern-tree
```

### Vấn đề 2: Permission check luôn trả về false

**Nguyên nhân:**
- User chưa được gán role có permission đó
- Token JWT không hợp lệ
- AuthContext chưa load permissions

**Giải pháp:**
```javascript
// Check trong console
console.log('User permissions:', user?.permissions);
console.log('User roles:', user?.roles);

// Kiểm tra token
const token = localStorage.getItem('token');
console.log('Token:', token);

// Test API trực tiếp
const response = await axios.get('/api/auth/me');
console.log('User data from API:', response.data);
```

### Vấn đề 3: Seed fails với duplicate key error

**Nguyên nhân:**
- Permissions đã tồn tại trong database
- Có conflict về `code` hoặc `module + resource + action`

**Giải pháp:**
```sql
-- Xóa permissions cũ (cẩn thận!)
DELETE FROM "Permission" WHERE module = 'notification';

-- Hoặc update thay vì create
-- Seed script đã xử lý việc này bằng upsert
```

### Vấn đề 4: Icon không hiển thị

**Nguyên nhân:**
- Icon chưa được import
- Icon name sai trong config

**Giải pháp:**
```jsx
// File: QuanLyRoleUltraModern.jsx

// 1. Import icon
import { FaBell } from 'react-icons/fa';

// 2. Add to ICON_MAP
const ICON_MAP = {
  // ...
  FaBell
};

// 3. Check config
// modern-permissions.config.js
notification: {
  icon: 'FaBell',  // Phải khớp với tên trong ICON_MAP
  // ...
}
```

---

## 📈 Performance

### Backend Caching

Permissions được cache trong **5 phút** bằng NodeCache:

```javascript
// rbac.service.js
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getUserPermissions(userId) {
  const cacheKey = `user_permissions_${userId}`;

  // Check cache first
  let permissions = cache.get(cacheKey);

  if (!permissions) {
    // Query database
    permissions = await queryUserPermissions(userId);

    // Store in cache
    cache.set(cacheKey, permissions);
  }

  return permissions;
}
```

**Lợi ích:**
- Giảm số lần query database
- Tăng tốc độ response
- Giảm tải cho database

### Frontend Optimization

```jsx
// AuthContext lưu permissions trong state
const [user, setUser] = useState({
  permissions: [],  // Cached permissions
  roles: []         // Cached roles
});

// usePermission hook không gọi API
const hasPermission = (code) => {
  return user?.permissions?.includes(code);
};
```

### Database Indexes

```sql
-- Index for faster permission lookup
CREATE INDEX idx_permission_code ON "Permission"(code);
CREATE INDEX idx_permission_module ON "Permission"(module);
CREATE INDEX idx_permission_is_active ON "Permission"(is_active);

-- Index for role-permission relationship
CREATE INDEX idx_role_permission_role_id ON "RolePermission"(role_id);
CREATE INDEX idx_role_permission_permission_id ON "RolePermission"(permission_id);

-- Index for user-role relationship
CREATE INDEX idx_user_role_user_id ON "UserRole"(user_id);
CREATE INDEX idx_user_role_role_id ON "UserRole"(role_id);
```

---

## 🔄 Migration từ Hệ thống Cũ

Nếu bạn đang có hệ thống phân quyền cũ và muốn migrate sang hệ thống mới:

### Bước 1: Backup Database

```bash
pg_dump -U postgres -d your_database > backup_before_migration.sql
```

### Bước 2: Chạy Seed Modern Permissions

```bash
node prisma/seed-modern.js
```

Seed script sẽ:
- ✅ Giữ nguyên permissions cũ
- ✅ Thêm permissions mới
- ✅ Update metadata (ui_path, ui_category, ui_element)

### Bước 3: Map Old Permissions sang New Permissions

**Script:** `migration-helper.js`

```javascript
const oldToNewPermissionMap = {
  'user:read': 'user.management.list.view',
  'user:create': 'user.management.actions.create',
  'user:update': 'user.management.actions.edit',
  'user:delete': 'user.management.actions.delete',
  // ... more mappings
};

async function migrateRolePermissions() {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } }
  });

  for (const role of roles) {
    for (const rp of role.rolePermissions) {
      const oldCode = rp.permission.code;
      const newCode = oldToNewPermissionMap[oldCode];

      if (newCode && newCode !== oldCode) {
        // Find new permission
        const newPerm = await prisma.permission.findUnique({
          where: { code: newCode }
        });

        if (newPerm) {
          // Add new permission to role
          await prisma.rolePermission.create({
            data: {
              role_id: role.id,
              permission_id: newPerm.id
            }
          });

          console.log(`Migrated: ${oldCode} → ${newCode} for role ${role.name}`);
        }
      }
    }
  }
}
```

### Bước 4: Test Thoroughly

Sau khi migration, test kỹ:
- ✅ Tất cả roles vẫn có permissions đúng
- ✅ Users vẫn truy cập được các trang như cũ
- ✅ API endpoints vẫn protected đúng
- ✅ UI hiển thị đúng permissions

---

## 📚 Tài liệu Tham khảo

### Files quan trọng:

1. **`HUONG_DAN_THEM_CHUC_NANG_MOI.md`**
   - Hướng dẫn chi tiết cách thêm chức năng mới
   - Các ví dụ cụ thể
   - Best practices

2. **`modern-permissions.config.js`**
   - Config chính định nghĩa tất cả permissions
   - Source of truth cho hệ thống

3. **`QuanLyRoleUltraModern.jsx`**
   - UI component hiện đại
   - Reference implementation

4. **`seed-modern.js`**
   - Script để import permissions vào database
   - Hỗ trợ upsert (update hoặc create)

### External Resources:

- [React Icons](https://react-icons.github.io/react-icons/) - Icon library
- [Bootstrap 5](https://getbootstrap.com/docs/5.0/) - UI framework
- [Prisma](https://www.prisma.io/docs/) - ORM documentation

---

## 🎉 Kết luận

Hệ thống phân quyền hiện đại này giúp bạn:

✅ **Dễ quản lý** - Cấu trúc rõ ràng, tổ chức theo trang/chức năng

✅ **Dễ mở rộng** - Thêm chức năng mới chỉ mất 5 phút

✅ **Dễ sử dụng** - UI hiện đại, trực quan, dễ thao tác

✅ **Bảo mật tốt** - Permission check ở cả frontend và backend

✅ **Performance cao** - Caching thông minh, database indexes

✅ **Maintainable** - Code sạch, tài liệu đầy đủ

---

**Nếu gặp vấn đề hoặc cần hỗ trợ:**
1. Đọc file `HUONG_DAN_THEM_CHUC_NANG_MOI.md`
2. Kiểm tra phần Troubleshooting
3. Kiểm tra console logs (browser & server)
4. Liên hệ team phát triển

**Happy coding! 🚀**
