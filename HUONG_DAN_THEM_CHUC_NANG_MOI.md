# Hướng dẫn thêm chức năng mới vào hệ thống phân quyền

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Quy trình thêm chức năng mới](#quy-trình-thêm-chức-năng-mới)
3. [Ví dụ cụ thể](#ví-dụ-cụ-thể)
4. [Checklist](#checklist)
5. [Lưu ý quan trọng](#lưu-ý-quan-trọng)

---

## Tổng quan

Hệ thống phân quyền hiện tại được tổ chức theo cấu trúc:

```
Module (ví dụ: user, gis, report)
  └── Page (ví dụ: management, layers, statistics)
      └── Feature (ví dụ: list, actions, export)
          └── Permissions (ví dụ: view, create, edit, delete)
```

**File quan trọng:**
- **Config permissions**: `microservices/services/auth-service/src/config/modern-permissions.config.js`
- **Seed file**: `microservices/services/auth-service/prisma/seed-modern.js`
- **Frontend component**: `client/src/dashboard/pages/QuanLyRoleUltraModern.jsx`

---

## Quy trình thêm chức năng mới

### Bước 1: Cập nhật Config File

**File:** `microservices/services/auth-service/src/config/modern-permissions.config.js`

#### 1.1. Thêm module mới (nếu cần)

```javascript
const MODERN_PERMISSIONS = {
  // ... existing modules

  // MODULE MỚI
  notification: {
    name: 'Hệ thống thông báo',
    icon: 'FaBell',
    color: '#FF5722',
    pages: {
      // Thêm pages ở đây
    }
  }
};
```

#### 1.2. Thêm page mới vào module

```javascript
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
        // Thêm features ở đây
      }
    }
  }
}
```

#### 1.3. Thêm feature vào page

```javascript
management: {
  name: 'Quản lý thông báo',
  path: '/notifications',
  icon: 'FaBell',
  features: {
    list: {
      name: 'Danh sách thông báo',
      permissions: [
        {
          code: 'notification.management.list.view',
          name: 'Xem danh sách thông báo',
          description: 'Hiển thị danh sách các thông báo',
          ui_element: 'Notifications Table'
        }
      ]
    },
    actions: {
      name: 'Thao tác thông báo',
      permissions: [
        {
          code: 'notification.management.actions.create',
          name: 'Tạo thông báo mới',
          description: 'Gửi thông báo mới cho người dùng',
          ui_element: 'Create Notification Button'
        },
        {
          code: 'notification.management.actions.delete',
          name: 'Xóa thông báo',
          description: 'Xóa thông báo đã gửi',
          ui_element: 'Delete Notification Button'
        }
      ]
    }
  }
}
```

**Quy ước đặt tên permission code:**
```
{module}.{page}.{feature}.{action}

Ví dụ:
- notification.management.list.view
- notification.management.actions.create
- user.profile.edit.password
```

---

### Bước 2: Tạo Seed File (nếu chưa có)

**File:** `microservices/services/auth-service/prisma/seed-modern.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const { flattenPermissions } = require('../src/config/modern-permissions.config');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding modern permissions...');

  const permissions = flattenPermissions();

  for (const perm of permissions) {
    try {
      // Upsert permission (insert nếu chưa có, update nếu đã có)
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description,
          module: perm.module,
          resource: perm.resource,
          action: perm.action,
          ui_path: perm.ui_path,
          ui_category: perm.ui_category,
          ui_element: perm.ui_element,
          icon: perm.icon,
          order: perm.order,
          is_active: true
        },
        create: {
          code: perm.code,
          name: perm.name,
          description: perm.description,
          module: perm.module,
          resource: perm.resource,
          action: perm.action,
          ui_path: perm.ui_path,
          ui_category: perm.ui_category,
          ui_element: perm.ui_element,
          icon: perm.icon,
          order: perm.order,
          is_active: true
        }
      });

      console.log(`✓ Permission: ${perm.code}`);
    } catch (error) {
      console.error(`✗ Failed to create permission ${perm.code}:`, error.message);
    }
  }

  console.log('✅ Modern permissions seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding modern permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### Bước 3: Chạy Seed để cập nhật Database

```bash
# Di chuyển vào thư mục auth-service
cd microservices/services/auth-service

# Chạy seed file
node prisma/seed-modern.js
```

**Lưu ý:** Nếu bạn muốn thêm vào file seed chính:

```bash
# Cập nhật trong package.json
{
  "prisma": {
    "seed": "node prisma/seed-modern.js"
  }
}

# Sau đó chạy:
npx prisma db seed
```

---

### Bước 4: Kiểm tra Database

Kết nối vào PostgreSQL và kiểm tra:

```sql
-- Kiểm tra permissions vừa thêm
SELECT id, code, name, module, resource, action, ui_path
FROM "Permission"
WHERE module = 'notification'
ORDER BY code;

-- Hoặc kiểm tra tất cả permissions
SELECT module, COUNT(*) as total
FROM "Permission"
WHERE is_active = true
GROUP BY module
ORDER BY module;
```

---

### Bước 5: Cập nhật Frontend Component (nếu cần icon mới)

**File:** `client/src/dashboard/pages/QuanLyRoleUltraModern.jsx`

Nếu bạn sử dụng icon mới, hãy import và thêm vào `ICON_MAP`:

```javascript
import {
  // ... existing imports
  FaBell  // Icon mới
} from 'react-icons/fa';

// Icon mapping
const ICON_MAP = {
  // ... existing icons
  FaBell
};
```

---

### Bước 6: Sử dụng Permission trong Frontend

#### 6.1. Sử dụng PermissionGuard Component

```jsx
import PermissionGuard from '@/components/PermissionGuard';

// Ẩn/hiện nút dựa trên permission
<PermissionGuard permission="notification.management.actions.create">
  <button className="btn btn-primary">
    Tạo thông báo
  </button>
</PermissionGuard>

// Ẩn/hiện section
<PermissionGuard permission="notification.management.list.view">
  <div className="notifications-list">
    {/* Danh sách thông báo */}
  </div>
</PermissionGuard>
```

#### 6.2. Sử dụng usePermission Hook

```jsx
import { usePermission } from '@/hooks/usePermission';

function NotificationPage() {
  const { hasPermission, hasAnyPermission } = usePermission();

  const canCreate = hasPermission('notification.management.actions.create');
  const canViewOrEdit = hasAnyPermission([
    'notification.management.list.view',
    'notification.management.actions.edit'
  ]);

  return (
    <div>
      {canCreate && (
        <button onClick={handleCreate}>Tạo thông báo</button>
      )}

      {canViewOrEdit ? (
        <NotificationList />
      ) : (
        <div>Bạn không có quyền xem thông báo</div>
      )}
    </div>
  );
}
```

---

### Bước 7: Bảo vệ API Endpoints (Backend)

**File:** `microservices/services/notification-service/src/routes/notification.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { requirePermission } = require('../middleware/permission.middleware');

// Bảo vệ endpoint với permission
router.get(
  '/',
  requirePermission('notification.management.list.view'),
  notificationController.getAll
);

router.post(
  '/',
  requirePermission('notification.management.actions.create'),
  notificationController.create
);

router.delete(
  '/:id',
  requirePermission('notification.management.actions.delete'),
  notificationController.delete
);

module.exports = router;
```

---

## Ví dụ cụ thể

### Ví dụ 1: Thêm chức năng "Xuất Excel" vào trang Quản lý người dùng

**Bước 1:** Mở `modern-permissions.config.js`

Tìm module `user` → page `management` → thêm permission vào feature `export`:

```javascript
export: {
  name: 'Xuất dữ liệu',
  permissions: [
    {
      code: 'user.management.export.excel',
      name: 'Xuất Excel',
      description: 'Xuất danh sách người dùng ra file Excel',
      ui_element: 'Export Excel Button'
    },
    // Thêm permission mới
    {
      code: 'user.management.export.csv',
      name: 'Xuất CSV',
      description: 'Xuất danh sách người dùng ra file CSV',
      ui_element: 'Export CSV Button'
    }
  ]
}
```

**Bước 2:** Chạy seed

```bash
cd microservices/services/auth-service
node prisma/seed-modern.js
```

**Bước 3:** Sử dụng trong React

```jsx
<PermissionGuard permission="user.management.export.csv">
  <button onClick={handleExportCSV}>
    <FaFileCsv /> Xuất CSV
  </button>
</PermissionGuard>
```

**Bước 4:** Bảo vệ API endpoint

```javascript
router.get(
  '/export/csv',
  requirePermission('user.management.export.csv'),
  userController.exportCSV
);
```

---

### Ví dụ 2: Thêm module mới "Settings" (Cài đặt)

**Bước 1:** Thêm vào `modern-permissions.config.js`

```javascript
const MODERN_PERMISSIONS = {
  // ... existing modules

  settings: {
    name: 'Cài đặt hệ thống',
    icon: 'FaCogs',
    color: '#607D8B',
    pages: {
      general: {
        name: 'Cài đặt chung',
        path: '/settings/general',
        icon: 'FaSlidersH',
        features: {
          view: {
            name: 'Xem cài đặt',
            permissions: [
              {
                code: 'settings.general.view.config',
                name: 'Xem cấu hình',
                description: 'Xem các thiết lập hệ thống',
                ui_element: 'Settings Page'
              }
            ]
          },
          edit: {
            name: 'Chỉnh sửa cài đặt',
            permissions: [
              {
                code: 'settings.general.edit.config',
                name: 'Sửa cấu hình',
                description: 'Chỉnh sửa thiết lập hệ thống',
                ui_element: 'Edit Settings Form'
              }
            ]
          }
        }
      },
      email: {
        name: 'Cài đặt Email',
        path: '/settings/email',
        icon: 'FaEnvelope',
        features: {
          smtp: {
            name: 'SMTP Config',
            permissions: [
              {
                code: 'settings.email.smtp.view',
                name: 'Xem cấu hình SMTP',
                description: 'Xem thiết lập máy chủ SMTP',
                ui_element: 'SMTP Settings'
              },
              {
                code: 'settings.email.smtp.edit',
                name: 'Sửa cấu hình SMTP',
                description: 'Chỉnh sửa thiết lập SMTP',
                ui_element: 'SMTP Form'
              }
            ]
          },
          templates: {
            name: 'Email Templates',
            permissions: [
              {
                code: 'settings.email.templates.view',
                name: 'Xem mẫu email',
                description: 'Xem danh sách mẫu email',
                ui_element: 'Email Templates List'
              },
              {
                code: 'settings.email.templates.edit',
                name: 'Sửa mẫu email',
                description: 'Chỉnh sửa nội dung mẫu email',
                ui_element: 'Email Template Editor'
              }
            ]
          }
        }
      }
    }
  }
};
```

**Bước 2:** Import icon mới trong React (nếu cần)

```jsx
import { FaCogs, FaSlidersH, FaEnvelope } from 'react-icons/fa';

const ICON_MAP = {
  // ...
  FaCogs,
  FaSlidersH,
  FaEnvelope
};
```

**Bước 3:** Chạy seed

```bash
node prisma/seed-modern.js
```

**Bước 4:** Kiểm tra trong UI

Đăng nhập vào hệ thống → Vào trang "Quản lý vai trò" → Chọn một vai trò → Click "Phân quyền"

Bạn sẽ thấy module "Cài đặt hệ thống" xuất hiện với đầy đủ các permissions vừa thêm.

---

## Checklist

Khi thêm chức năng mới, hãy kiểm tra các bước sau:

- [ ] **Đã cập nhật** `modern-permissions.config.js` với permission mới
- [ ] **Đã chạy seed** để cập nhật database
- [ ] **Đã kiểm tra** database có permission mới (bằng SQL query)
- [ ] **Đã thêm icon mới** vào `ICON_MAP` trong React component (nếu cần)
- [ ] **Đã sử dụng** `PermissionGuard` hoặc `usePermission` trong frontend
- [ ] **Đã bảo vệ** API endpoint với `requirePermission` middleware
- [ ] **Đã test** chức năng với vai trò có quyền và không có quyền
- [ ] **Đã cập nhật** documentation (nếu cần)

---

## Lưu ý quan trọng

### 1. Quy ước đặt tên Permission Code

**Format chuẩn:**
```
{module}.{page}.{feature}.{action}
```

**Ví dụ:**
- ✅ `user.management.list.view` - Đúng
- ✅ `gis.layers.actions.create` - Đúng
- ❌ `user_list_view` - Sai (không theo format)
- ❌ `user.view` - Sai (thiếu page và feature)

**Module:** Tên module/service (user, gis, report, admin, etc.)

**Page:** Trang cụ thể trong module (management, layers, statistics, etc.)

**Feature:** Nhóm chức năng trong trang (list, actions, export, etc.)

**Action:** Hành động cụ thể (view, create, edit, delete, export, etc.)

---

### 2. Các Action phổ biến

| Action | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `view` | Xem dữ liệu | Xem danh sách, xem chi tiết |
| `create` | Tạo mới | Thêm người dùng, tạo báo cáo |
| `edit` / `update` | Chỉnh sửa | Sửa thông tin, cập nhật |
| `delete` | Xóa | Xóa người dùng, xóa báo cáo |
| `export` | Xuất dữ liệu | Xuất Excel, xuất PDF |
| `import` | Nhập dữ liệu | Import từ file |
| `approve` | Phê duyệt | Duyệt dữ liệu, duyệt báo cáo |
| `reject` | Từ chối | Từ chối phê duyệt |
| `publish` | Xuất bản | Xuất bản báo cáo |
| `archive` | Lưu trữ | Đưa vào kho lưu trữ |
| `execute` | Thực thi | Chạy lệnh, thực hiện hành động |
| `search` | Tìm kiếm | Tìm kiếm dữ liệu |
| `filter` | Lọc | Lọc danh sách |
| `assign` | Gán | Gán quyền, gán vai trò |
| `revoke` | Gỡ bỏ | Gỡ quyền, gỡ vai trò |

---

### 3. Phân cấp Permission theo mức độ quan trọng

Khi thiết kế permissions, nên tổ chức theo thứ tự:

1. **View (Xem)** - Permission cơ bản nhất
2. **Filter/Search (Lọc/Tìm kiếm)** - Nâng cao hơn
3. **Create (Tạo)** - Thêm dữ liệu mới
4. **Edit (Sửa)** - Chỉnh sửa dữ liệu có sẵn
5. **Delete (Xóa)** - Xóa dữ liệu (cần thận trọng)
6. **Export (Xuất)** - Xuất dữ liệu ra ngoài
7. **Admin actions (Thao tác admin)** - Approve, reject, publish, archive

**Ví dụ phân quyền cho một vai trò:**

```javascript
// Viewer role - Chỉ xem
permissions: [
  'user.management.list.view',
  'user.management.list.search'
]

// Editor role - Xem và sửa
permissions: [
  'user.management.list.view',
  'user.management.list.search',
  'user.management.actions.edit'
]

// Manager role - Toàn quyền
permissions: [
  'user.management.list.view',
  'user.management.list.search',
  'user.management.actions.create',
  'user.management.actions.edit',
  'user.management.actions.delete',
  'user.management.export.excel'
]
```

---

### 4. Khi nào cần tạo Feature mới?

Tạo **Feature** mới khi:
- Nhóm các permissions liên quan đến một chức năng cụ thể
- Muốn người dùng có thể chọn/bỏ chọn cả nhóm permissions cùng lúc

**Ví dụ:**

```javascript
// Feature "list" - Các quyền liên quan đến danh sách
list: {
  name: 'Danh sách',
  permissions: [
    { code: 'user.management.list.view', ... },
    { code: 'user.management.list.search', ... },
    { code: 'user.management.list.filter', ... }
  ]
}

// Feature "actions" - Các thao tác chính
actions: {
  name: 'Thao tác',
  permissions: [
    { code: 'user.management.actions.create', ... },
    { code: 'user.management.actions.edit', ... },
    { code: 'user.management.actions.delete', ... }
  ]
}
```

---

### 5. Tối ưu hiệu suất

**Backend:**
- Permissions được cache trong 5 phút (sử dụng NodeCache)
- Chỉ query database khi cache hết hạn
- Sử dụng pattern matching với wildcard (`user.*`, `gis.layers.*`)

**Frontend:**
- Permissions được lưu trong AuthContext (global state)
- Không gọi API mỗi lần check permission
- Sử dụng `useMemo` cho các tính toán phức tạp

---

### 6. Testing

#### Test Backend Permission

```javascript
// Test permission check
const rbacService = require('./services/rbac.service');

const userId = 1;
const hasPermission = await rbacService.hasPermission(
  userId,
  'user.management.list.view'
);

console.log('Has permission:', hasPermission);
```

#### Test Frontend Permission

```jsx
// Trong React component
const { hasPermission } = usePermission();

useEffect(() => {
  console.log('Can create user:', hasPermission('user.management.actions.create'));
  console.log('Can delete user:', hasPermission('user.management.actions.delete'));
}, [hasPermission]);
```

---

### 7. Troubleshooting

**Lỗi: Permission không hiển thị trong UI**

✅ Kiểm tra:
1. Đã chạy seed chưa?
2. Permission có `is_active = true` không?
3. Code format đúng chưa? (`module.page.feature.action`)
4. Icon đã được import vào `ICON_MAP` chưa?

**Lỗi: Permission check luôn trả về false**

✅ Kiểm tra:
1. User có được gán role có permission đó không?
2. Token JWT có hợp lệ không?
3. AuthContext có load permissions không?
4. Permission code có chính xác không?

**Lỗi: API endpoint vẫn truy cập được dù không có quyền**

✅ Kiểm tra:
1. Đã thêm middleware `requirePermission` chưa?
2. Middleware có được apply đúng thứ tự không?
3. Token có đang được gửi trong header không?

---

### 8. Best Practices

1. **Luôn đặt tên permission có ý nghĩa rõ ràng**
   - ✅ `user.management.actions.delete` - Dễ hiểu
   - ❌ `user.del` - Khó hiểu

2. **Tổ chức permissions theo cấu trúc trang/chức năng**
   - Giúp dễ quản lý và mở rộng

3. **Sử dụng description chi tiết**
   - Giúp admin hiểu rõ permission làm gì

4. **Chỉ định ui_element cụ thể**
   - Giúp developer biết áp dụng vào đâu trong UI

5. **Test kỹ trước khi deploy**
   - Test với nhiều vai trò khác nhau
   - Test cả trường hợp có quyền và không có quyền

6. **Backup database trước khi chạy seed**
   ```bash
   pg_dump -U postgres -d dbname > backup.sql
   ```

7. **Sử dụng transaction khi seed nhiều data**
   ```javascript
   await prisma.$transaction(async (tx) => {
     // Your seed operations here
   });
   ```

---

## Kết luận

Với hướng dẫn này, bạn có thể dễ dàng thêm chức năng mới vào hệ thống phân quyền một cách có tổ chức và dễ bảo trì.

**Quy trình tóm tắt:**
1. Cập nhật `modern-permissions.config.js`
2. Chạy seed để cập nhật database
3. Sử dụng permission trong frontend (PermissionGuard/usePermission)
4. Bảo vệ API với middleware `requirePermission`
5. Test kỹ càng

**Lợi ích:**
- ✅ Dễ quản lý và mở rộng
- ✅ UI hiện đại, dễ sử dụng
- ✅ Cấu trúc rõ ràng theo trang/chức năng
- ✅ Tự động đồng bộ giữa config và database
- ✅ Hỗ trợ việc gán quyền linh hoạt

Nếu gặp vấn đề, hãy tham khảo phần [Troubleshooting](#7-troubleshooting) hoặc liên hệ với team phát triển.

---

**Tài liệu liên quan:**
- `modern-permissions.config.js` - Config chính
- `QuanLyRoleUltraModern.jsx` - UI component
- `permission.controller.js` - API endpoints
- `rbac.service.js` - Permission checking logic
