# 📚 HƯỚNG DẪN HỆ THỐNG PHÂN QUYỀN ĐỘNG THEO TRANG

## 🎯 Tổng quan

Hệ thống phân quyền được thiết kế theo mô hình **Page-Based Permissions**, tức là phân quyền được tổ chức theo **cấu trúc trang web thực tế**, liên kết trực tiếp với các **nút bấm, chức năng cụ thể** trên giao diện.

### Cấu trúc phân quyền

```
📄 Trang (Page)
  └─ 📦 Khu vực (Section)
      └─ ⚙️  Chức năng (Feature)
          └─ 🔑 Quyền (Permission)
```

**Ví dụ cụ thể:**
- **Trang:** Quản lý người dùng (`/admin/users`)
  - **Section:** Danh sách người dùng
    - **Feature:** Nút thêm người dùng
      - **Permission:** `user.list.button.add` → Hiển thị button "Thêm người dùng"

---

## 📁 Cấu trúc File

```
microservices/services/auth-service/
├── src/
│   ├── config/
│   │   └── page-permissions.config.js     ← ⭐ File config chính
│   ├── controllers/
│   │   └── permission.controller.js       ← API controllers
│   └── routes/
│       └── permission.routes.js           ← API routes
└── prisma/
    ├── schema.prisma                      ← Database schema
    ├── seed.js                            ← Seed permissions cũ
    └── seed-page-permissions.js           ← ⭐ Seed permissions mới

client/src/dashboard/pages/
└── QuanLyRoleModern.jsx                   ← ⭐ UI modern để quản lý phân quyền
```

---

## 🚀 HƯỚNG DẪN THÊM CHỨC NĂNG MỚI VÀO HỆ THỐNG PHÂN QUYỀN

### Bước 1: Thêm permission vào config

**File:** `microservices/services/auth-service/src/config/page-permissions.config.js`

#### 1.1. Thêm trang mới (nếu chưa có)

```javascript
const PAGE_PERMISSIONS = {
  // ... các trang khác

  // ==================== TRANG MỚI ====================
  my_new_page: {
    page: {
      path: '/my-new-page',           // URL của trang
      name: 'Tên trang mới',          // Tên hiển thị
      icon: 'FaNewIcon',              // Icon (phải import trong QuanLyRoleModern.jsx)
      description: 'Mô tả trang'      // Mô tả ngắn
    },
    sections: {
      // Xem bước 1.2
    }
  }
};
```

#### 1.2. Thêm section (khu vực chức năng)

```javascript
sections: {
  main_section: {
    name: 'Khu vực chính',
    features: {
      // Xem bước 1.3
    }
  }
}
```

#### 1.3. Thêm feature (chức năng cụ thể)

```javascript
features: {
  view_data: {
    name: 'Xem dữ liệu',                          // Tên hiển thị
    permission: 'my_page.main_section.view',      // Mã permission
    ui_element: 'Table dữ liệu'                   // Mô tả UI element
  },
  create_button: {
    name: 'Nút tạo mới',
    permission: 'my_page.main_section.create',
    ui_element: 'Button "Tạo mới"'
  },
  edit_button: {
    name: 'Nút chỉnh sửa',
    permission: 'my_page.main_section.edit',
    ui_element: 'Button "Chỉnh sửa"'
  },
  delete_button: {
    name: 'Nút xóa',
    permission: 'my_page.main_section.delete',
    ui_element: 'Button "Xóa"'
  }
}
```

### ✅ Ví dụ đầy đủ: Thêm trang "Quản lý Cấu hình"

```javascript
config_management: {
  page: {
    path: '/admin/config',
    name: 'Quản lý Cấu hình',
    icon: 'FaCog',
    description: 'Quản lý cấu hình hệ thống'
  },
  sections: {
    general_settings: {
      name: 'Cài đặt chung',
      features: {
        view_settings: {
          name: 'Xem cài đặt',
          permission: 'config.general.view',
          ui_element: 'Form cài đặt chung'
        },
        edit_settings: {
          name: 'Chỉnh sửa cài đặt',
          permission: 'config.general.edit',
          ui_element: 'Button "Lưu cài đặt"'
        }
      }
    },
    email_config: {
      name: 'Cấu hình Email',
      features: {
        view_email_config: {
          name: 'Xem cấu hình email',
          permission: 'config.email.view',
          ui_element: 'Form cấu hình email'
        },
        edit_email_config: {
          name: 'Sửa cấu hình email',
          permission: 'config.email.edit',
          ui_element: 'Button "Lưu email config"'
        },
        test_email: {
          name: 'Test gửi email',
          permission: 'config.email.test',
          ui_element: 'Button "Test Email"'
        }
      }
    }
  }
}
```

---

### Bước 2: Import permissions vào database

Sau khi thêm vào config, chạy lệnh seed:

```bash
cd microservices/services/auth-service
node prisma/seed-page-permissions.js
```

**Output mong đợi:**
```
🌱 Starting Page-Based Permissions Seeding...

📋 Found 95 page-based permissions to seed

   ✓ dashboard.overview.user_stats.view
   ✓ dashboard.overview.gis_stats.view
   ✓ user.list.table.view
   ✓ user.list.button.add
   ✓ config.general.view
   ✓ config.general.edit
   ✓ config.email.view
   ✓ config.email.edit
   ✓ config.email.test
   ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Page-Based Permissions Seeded!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
   • Created: 10
   • Updated: 85
   • Total: 95
```

---

### Bước 3: Sử dụng permission trong React component

#### 3.1. Tạo Permission Hook

**File:** `client/src/hooks/usePermission.js`

```javascript
import { useAuth } from '../contexts/AuthContext';

export const usePermission = () => {
  const { user } = useAuth();

  const hasPermission = (permissionCode) => {
    if (!user || !user.permissions) return false;

    // Super admin có tất cả quyền
    if (user.roles?.includes('super_admin')) return true;

    // Check exact permission code
    return user.permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes) => {
    return permissionCodes.some(code => hasPermission(code));
  };

  const hasAllPermissions = (permissionCodes) => {
    return permissionCodes.every(code => hasPermission(code));
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions };
};
```

#### 3.2. Sử dụng trong component

**File:** `client/src/dashboard/pages/ConfigManagement.jsx`

```javascript
import React from 'react';
import { usePermission } from '../../hooks/usePermission';

const ConfigManagement = () => {
  const { hasPermission } = usePermission();

  return (
    <div>
      <h1>Quản lý Cấu hình</h1>

      {/* Chỉ hiển thị form nếu có quyền xem */}
      {hasPermission('config.general.view') && (
        <div className="general-settings">
          <h2>Cài đặt chung</h2>

          {/* Form hiển thị settings */}
          <form>
            <input name="site_name" />
            <input name="site_url" />

            {/* Nút lưu chỉ hiển thị nếu có quyền edit */}
            {hasPermission('config.general.edit') && (
              <button type="submit">Lưu cài đặt</button>
            )}
          </form>
        </div>
      )}

      {/* Email config section */}
      {hasPermission('config.email.view') && (
        <div className="email-config">
          <h2>Cấu hình Email</h2>

          <form>
            <input name="smtp_host" />
            <input name="smtp_port" />

            {hasPermission('config.email.edit') && (
              <button type="submit">Lưu</button>
            )}

            {hasPermission('config.email.test') && (
              <button type="button">Test Email</button>
            )}
          </form>
        </div>
      )}

      {/* Nếu không có quyền gì */}
      {!hasPermission('config.general.view') && !hasPermission('config.email.view') && (
        <div className="alert alert-warning">
          Bạn không có quyền truy cập trang này
        </div>
      )}
    </div>
  );
};

export default ConfigManagement;
```

#### 3.3. Component Permission Wrapper

Tạo component wrapper để dùng cho các UI elements:

**File:** `client/src/components/PermissionGuard.jsx`

```javascript
import { usePermission } from '../hooks/usePermission';

export const PermissionGuard = ({
  permission,
  children,
  fallback = null
}) => {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
};

// Sử dụng:
// <PermissionGuard permission="config.general.edit">
//   <button>Lưu cài đặt</button>
// </PermissionGuard>
```

---

### Bước 4: Phân quyền cho Role

Sau khi thêm permissions mới, bạn cần gán chúng cho các role:

1. **Truy cập UI:** `http://localhost:3000/admin/roles` (hoặc dùng `QuanLyRoleModern.jsx`)
2. **Chọn role** cần phân quyền (ví dụ: `admin`)
3. **Click "Phân quyền"**
4. **Tìm trang mới** (ví dụ: "Quản lý Cấu hình")
5. **Chọn các quyền** cần thiết:
   - ✅ Xem cài đặt
   - ✅ Chỉnh sửa cài đặt
   - ✅ Xem cấu hình email
   - ✅ Sửa cấu hình email
   - ✅ Test gửi email
6. **Click "Lưu quyền hạn"**

---

## 🔐 Phân quyền ở Backend API

### Bước 5: Tạo middleware kiểm tra permission

**File:** `microservices/gateway/src/middleware/permission.js`

```javascript
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const { user } = req; // Từ JWT middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Super admin bypass
    if (user.roles?.includes('super_admin')) {
      return next();
    }

    // Check permission
    if (!user.permissions?.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Required: ${requiredPermission}`
      });
    }

    next();
  };
};

module.exports = { checkPermission };
```

### Bước 6: Áp dụng middleware cho routes

**File:** `microservices/services/admin-service/src/routes/config.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { checkPermission } = require('../middleware/permission');

// GET /api/admin/config/general - Xem cài đặt chung
router.get(
  '/general',
  checkPermission('config.general.view'),
  configController.getGeneralSettings
);

// PUT /api/admin/config/general - Sửa cài đặt chung
router.put(
  '/general',
  checkPermission('config.general.edit'),
  configController.updateGeneralSettings
);

// GET /api/admin/config/email - Xem cấu hình email
router.get(
  '/email',
  checkPermission('config.email.view'),
  configController.getEmailConfig
);

// PUT /api/admin/config/email - Sửa cấu hình email
router.put(
  '/email',
  checkPermission('config.email.edit'),
  configController.updateEmailConfig
);

// POST /api/admin/config/email/test - Test email
router.post(
  '/email/test',
  checkPermission('config.email.test'),
  configController.testEmail
);

module.exports = router;
```

---

## 📋 Checklist khi thêm chức năng mới

- [ ] **Bước 1:** Thêm permission vào `page-permissions.config.js`
  - [ ] Định nghĩa page (nếu mới)
  - [ ] Định nghĩa sections
  - [ ] Định nghĩa features với permission codes rõ ràng
  - [ ] Mô tả UI element cụ thể

- [ ] **Bước 2:** Seed permissions vào database
  ```bash
  node prisma/seed-page-permissions.js
  ```

- [ ] **Bước 3:** Implement frontend
  - [ ] Tạo/cập nhật React component
  - [ ] Sử dụng `usePermission()` hook
  - [ ] Ẩn/hiện UI elements dựa trên permissions
  - [ ] Test UI với các roles khác nhau

- [ ] **Bước 4:** Implement backend
  - [ ] Tạo API routes
  - [ ] Áp dụng `checkPermission()` middleware
  - [ ] Test API với tokens của các roles khác nhau

- [ ] **Bước 5:** Phân quyền cho roles
  - [ ] Vào UI Quản lý Role
  - [ ] Gán permissions mới cho các roles phù hợp
  - [ ] Kiểm tra lại permissions của từng role

- [ ] **Bước 6:** Testing end-to-end
  - [ ] Login với role có quyền → Xác nhận thấy chức năng
  - [ ] Login với role không có quyền → Xác nhận không thấy chức năng
  - [ ] Test các trường hợp edge cases

---

## 🎨 Quy tắc đặt tên Permission Code

### Format chuẩn:
```
{page_key}.{section_key}.{action}
```

### Ví dụ:
- `user.list.table.view` - Xem bảng danh sách user
- `user.list.button.add` - Nút thêm user
- `user.detail.button.edit` - Nút sửa user
- `gis.map.viewer.view` - Xem bản đồ
- `gis.layer.button.add` - Nút thêm layer
- `report.list.button.create` - Nút tạo báo cáo
- `config.general.edit` - Sửa cấu hình chung

### Best Practices:
1. **Rõ ràng, cụ thể:** Tên permission phải mô tả chính xác chức năng
2. **Theo cấu trúc UI:** Map trực tiếp với elements trên giao diện
3. **Nhất quán:** Dùng cùng một naming convention cho toàn bộ hệ thống
4. **Phân cấp rõ ràng:** Page → Section → Feature
5. **Không dùng tên quá chung chung:** ❌ `user.manage` → ✅ `user.list.button.add`

---

## 🔄 Luồng hoạt động đầy đủ

```
1. Developer thêm permission vào config
   ↓
2. Seed permission vào database
   ↓
3. Admin gán permission cho role
   ↓
4. User login → JWT chứa permissions
   ↓
5. Frontend check permission → Hiển thị/ẩn UI
   ↓
6. Backend check permission → Cho phép/từ chối API call
```

---

## 🛠️ Troubleshooting

### Lỗi: Permission không hiển thị trong UI
**Nguyên nhân:** Chưa seed vào database
**Giải pháp:**
```bash
cd microservices/services/auth-service
node prisma/seed-page-permissions.js
```

### Lỗi: User có quyền nhưng vẫn bị từ chối
**Nguyên nhân:** JWT token cũ chưa chứa permission mới
**Giải pháp:** Logout và login lại để lấy token mới

### Lỗi: Icon không hiển thị
**Nguyên nhân:** Icon chưa được import trong `QuanLyRoleModern.jsx`
**Giải pháp:**
```javascript
// Thêm vào pageIcons object
const pageIcons = {
  FaHome: FaHome,
  FaNewIcon: FaNewIcon,  // ← Thêm icon mới
  // ...
};
```

---

## 📚 Tài liệu tham khảo

- **Config file:** `microservices/services/auth-service/src/config/page-permissions.config.js`
- **Seed script:** `microservices/services/auth-service/prisma/seed-page-permissions.js`
- **UI Modern:** `client/src/dashboard/pages/QuanLyRoleModern.jsx`
- **API Endpoints:**
  - `GET /api/auth/permissions/page-tree` - Lấy permission tree
  - `GET /api/auth/permissions/ui-grouped` - Lấy permissions grouped
  - `GET /api/auth/roles/:id` - Lấy permissions của role
  - `PUT /api/auth/roles/:id/permissions` - Gán permissions cho role

---

## 💡 Tips & Best Practices

1. **Phân quyền chi tiết:** Càng chi tiết càng tốt, tránh gán quyền quá rộng
2. **Test kỹ:** Luôn test với nhiều roles khác nhau
3. **Document rõ ràng:** Mô tả UI element cụ thể để dễ hiểu
4. **Consistent naming:** Giữ naming convention nhất quán
5. **Security-first:** Backend LUÔN LUÔN phải check permission, không tin tưởng frontend

---

## ✨ Kết luận

Hệ thống phân quyền page-based giúp bạn:
- ✅ Quản lý quyền hạn **cực kỳ chi tiết** theo từng nút bấm, chức năng
- ✅ Dễ dàng **mở rộng** khi thêm trang/chức năng mới
- ✅ **Trực quan** khi phân quyền cho role (thấy rõ trang nào, chức năng nào)
- ✅ **Modern UI** dễ sử dụng, phân cấp rõ ràng
- ✅ **Chuẩn production** - bảo mật cao, dễ maintain

🎉 **Chúc bạn thành công!**
