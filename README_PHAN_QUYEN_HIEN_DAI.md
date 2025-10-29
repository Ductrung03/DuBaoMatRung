# 🚀 Quick Start - Hệ thống Phân quyền Hiện đại

## ⚡ Cài đặt nhanh (5 phút)

### Bước 1: Chạy Seed
```bash
cd microservices/services/auth-service
node prisma/seed-modern.js
```

### Bước 2: Thêm Route
```jsx
// client/src/App.jsx
import QuanLyRoleUltraModern from './dashboard/pages/QuanLyRoleUltraModern';

<Route path="/roles" element={<QuanLyRoleUltraModern />} />
```

### Bước 3: Truy cập
```
http://localhost:5173/roles
```

---

## 📖 Tài liệu đầy đủ

- **[GIAI_PHAP_PHAN_QUYEN_HIEN_DAI.md](./GIAI_PHAP_PHAN_QUYEN_HIEN_DAI.md)** - Tổng quan hệ thống
- **[HUONG_DAN_THEM_CHUC_NANG_MOI.md](./HUONG_DAN_THEM_CHUC_NANG_MOI.md)** - Hướng dẫn chi tiết

---

## 🎯 Sử dụng nhanh

### Thêm permission mới (3 bước)

**1. Cập nhật config:**
```javascript
// microservices/services/auth-service/src/config/modern-permissions.config.js

user: {
  pages: {
    management: {
      features: {
        export: {
          permissions: [
            {
              code: 'user.management.export.csv',
              name: 'Xuất CSV',
              description: 'Xuất danh sách người dùng ra CSV',
              ui_element: 'Export CSV Button'
            }
          ]
        }
      }
    }
  }
}
```

**2. Chạy seed:**
```bash
node prisma/seed-modern.js
```

**3. Sử dụng trong code:**
```jsx
<PermissionGuard permission="user.management.export.csv">
  <button onClick={handleExportCSV}>Xuất CSV</button>
</PermissionGuard>
```

---

## ✨ Tính năng chính

✅ **142+ permissions** định nghĩa sẵn cho 9 modules

✅ **UI hiện đại** - Card-based, gradient, hover effects

✅ **4 cấp phân quyền** - Module → Page → Feature → Permission

✅ **Chọn nhiều cấp độ** - Chọn cả module, page, hoặc feature

✅ **Visual feedback** - Progress indicators, color coding

✅ **Responsive** - Mobile-friendly

---

## 🔐 Sử dụng trong Code

### Frontend
```jsx
import { usePermission } from '@/hooks/usePermission';

const { hasPermission } = usePermission();

if (hasPermission('user.management.actions.create')) {
  // Show create button
}
```

### Backend
```javascript
const { requirePermission } = require('../middleware/permission.middleware');

router.post(
  '/users',
  requirePermission('user.management.actions.create'),
  userController.create
);
```

---

## 📦 Files quan trọng

| File | Mô tả |
|------|-------|
| `microservices/services/auth-service/src/config/modern-permissions.config.js` | Config chính - Định nghĩa tất cả permissions |
| `microservices/services/auth-service/prisma/seed-modern.js` | Seed file - Import permissions vào DB |
| `client/src/dashboard/pages/QuanLyRoleUltraModern.jsx` | UI component - Giao diện quản lý phân quyền |
| `GIAI_PHAP_PHAN_QUYEN_HIEN_DAI.md` | Tài liệu đầy đủ |
| `HUONG_DAN_THEM_CHUC_NANG_MOI.md` | Hướng dẫn chi tiết |

---

## 🐛 Troubleshooting

**Permissions không hiển thị?**
```bash
# Check database
psql -U postgres -d your_db -c "SELECT COUNT(*) FROM \"Permission\";"

# Re-run seed
node prisma/seed-modern.js
```

**Permission check trả về false?**
```javascript
// Check trong console
console.log('User permissions:', user?.permissions);
```

**Icon không hiển thị?**
```jsx
// Import icon mới
import { FaBell } from 'react-icons/fa';

// Add to ICON_MAP
const ICON_MAP = { /* ... */, FaBell };
```

---

## 📞 Hỗ trợ

Nếu cần giúp đỡ, hãy:
1. Đọc `HUONG_DAN_THEM_CHUC_NANG_MOI.md`
2. Kiểm tra console logs
3. Liên hệ team phát triển

---

**Happy coding! 🎉**
