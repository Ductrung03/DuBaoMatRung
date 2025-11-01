# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG PHÂN QUYỀN MỚI

## 📋 Tổng quan

Hệ thống phân quyền mới được thiết kế theo cấu trúc **TRANG → CHỨC NĂNG**, giúp quản lý phân quyền chi tiết và trực quan hơn.

### 🎯 Nguyên tắc hoạt động:

1. **Phân quyền theo trang**: Mỗi trang trong ứng dụng có nhiều chức năng
2. **Phân quyền theo chức năng**: Mỗi chức năng có thể bật/tắt độc lập
3. **Hiển thị có điều kiện**: Chỉ hiển thị những trang/chức năng mà user có quyền

---

## 📁 Cấu trúc Phân quyền

### 1. **Dự báo mất rừng** (`forecast`)
- ✅ `forecast.auto` - Dự báo mất rừng tự động
- ✅ `forecast.custom` - Dự báo mất rừng tùy biến

### 2. **Quản lý dữ liệu** (`data_management`)
- ✅ `data_management.forecast_search` - Tra cứu dữ liệu dự báo mất rừng
- ✅ `data_management.satellite_search` - Tra cứu dữ liệu ảnh vệ tinh
- ✅ `data_management.verification` - Xác minh dự báo mất rừng
- ✅ `data_management.data_update` - Cập nhật dữ liệu

### 3. **Báo cáo** (`reports`)
- ✅ `reports.view` - Xem báo cáo
- ✅ `reports.create` - Tạo báo cáo
- ✅ `reports.export` - Xuất báo cáo
- ✅ `reports.statistics` - Thống kê báo cáo

### 4. **Phát hiện mất rừng** (`detection`)
- ✅ `detection.view` - Xem phát hiện
- ✅ `detection.verify` - Xác minh phát hiện
- ✅ `detection.reject` - Từ chối phát hiện
- ✅ `detection.analyze` - Phân tích phát hiện

### 5. **Quản lý người dùng** (`user_management`)
- ✅ `user_management.view` - Xem người dùng
- ✅ `user_management.create` - Tạo người dùng
- ✅ `user_management.edit` - Sửa người dùng
- ✅ `user_management.delete` - Xóa người dùng
- ✅ `user_management.assign_roles` - Gán vai trò

### 6. **Quản lý role** (`role_management`)
- ✅ `role_management.view` - Xem vai trò
- ✅ `role_management.create` - Tạo vai trò
- ✅ `role_management.edit` - Sửa vai trò
- ✅ `role_management.delete` - Xóa vai trò
- ✅ `role_management.assign_permissions` - Gán quyền cho vai trò

---

## 🔧 Cách sử dụng cho Developer

### 1. Bảo vệ cả trang (Page-level protection)

```jsx
import PageGuard from '../components/PageGuard';

const DuBaoMatRungPage = () => {
  return (
    <PageGuard pageKey="forecast">
      <div>
        {/* Nội dung trang */}
        <h1>Dự báo mất rừng</h1>
      </div>
    </PageGuard>
  );
};
```

### 2. Bảo vệ chức năng cụ thể (Feature-level protection)

```jsx
import FeatureGuard from '../components/FeatureGuard';

const DuBaoMatRungPage = () => {
  return (
    <div>
      <h1>Dự báo mất rừng</h1>

      {/* Tab Dự báo tự động - Chỉ hiển thị nếu có quyền */}
      <FeatureGuard featureCode="forecast.auto">
        <div>
          <h2>Dự báo tự động</h2>
          <button>Chạy dự báo</button>
        </div>
      </FeatureGuard>

      {/* Tab Dự báo tùy biến - Chỉ hiển thị nếu có quyền */}
      <FeatureGuard featureCode="forecast.custom">
        <div>
          <h2>Dự báo tùy biến</h2>
          <button>Tùy chỉnh tham số</button>
        </div>
      </FeatureGuard>
    </div>
  );
};
```

### 3. Sử dụng Hook để kiểm tra quyền

```jsx
import { useFeaturePermissions } from '../hooks/useFeaturePermissions';

const QuanLyDuLieuPage = () => {
  const { hasFeatureAccess, getPageFeatures } = useFeaturePermissions();

  // Lấy danh sách features có quyền
  const features = getPageFeatures('data_management');

  return (
    <div>
      <h1>Quản lý dữ liệu</h1>

      {/* Kiểm tra quyền rồi render */}
      {hasFeatureAccess('data_management.forecast_search') && (
        <button>Tra cứu dự báo</button>
      )}

      {hasFeatureAccess('data_management.verification') && (
        <button>Xác minh</button>
      )}

      {/* Hiển thị tabs dựa trên features có quyền */}
      <Tabs>
        {features.map(feature => (
          <Tab key={feature.code} label={feature.name}>
            {/* Nội dung tab */}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
};
```

### 4. Hiển thị sidebar động theo quyền

```jsx
import { useFeaturePermissions } from '../hooks/useFeaturePermissions';

const Sidebar = () => {
  const { getAccessiblePages } = useFeaturePermissions();

  const accessiblePages = getAccessiblePages();

  return (
    <nav>
      {accessiblePages.map(page => (
        <Link key={page.key} to={page.path}>
          <Icon name={page.icon} />
          {page.name}
        </Link>
      ))}
    </nav>
  );
};
```

---

## 🔐 Quản lý Permissions (Admin)

### Tạo Role mới với Permissions

#### Cách 1: Sử dụng Seed Script

```javascript
// microservices/services/auth-service/prisma/seed-feature-based.js

const SAMPLE_ROLES = [
  {
    name: 'data_analyst',
    description: 'Chuyên viên phân tích dữ liệu',
    is_system: false,
    permissions: [
      'data_management.forecast_search',
      'data_management.satellite_search',
      'reports.view',
      'reports.statistics'
    ]
  }
];
```

#### Cách 2: Sử dụng UI (Trang Quản lý Role)

1. Vào trang **Quản lý Role**
2. Click **"Tạo Role mới"**
3. Nhập tên và mô tả
4. Click **"Phân quyền"**
5. Tích chọn các trang và chức năng
6. Lưu lại

---

## 📊 API Endpoints

### 1. Lấy cấu trúc permissions tree

```bash
GET /api/auth/permissions/feature-tree
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": {
      "name": "Dự báo mất rừng",
      "path": "/dashboard/dubaomatrung",
      "icon": "FaChartLine",
      "features": {
        "auto": {
          "code": "forecast.auto",
          "name": "Dự báo mất rừng tự động",
          "description": "..."
        }
      }
    }
  }
}
```

### 2. Lấy permissions của user hiện tại

```bash
GET /api/auth/permissions/my-access
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "key": "forecast",
        "name": "Dự báo mất rừng",
        "path": "/dashboard/dubaomatrung",
        "features": [
          {
            "code": "forecast.auto",
            "name": "Dự báo mất rừng tự động"
          }
        ]
      }
    ]
  }
}
```

---

## 🎬 Ví dụ thực tế

### Ví dụ 1: User chỉ có quyền xem dự báo

```javascript
// Role: viewer
// Permissions: ['forecast.auto', 'data_management.forecast_search', 'reports.view']

// ✅ User sẽ thấy:
// - Sidebar: Dự báo mất rừng, Quản lý dữ liệu, Báo cáo
// - Trang Dự báo: Chỉ tab "Dự báo tự động"
// - Trang Quản lý dữ liệu: Chỉ tab "Tra cứu dự báo"
// - Trang Báo cáo: Chỉ có thể xem, không có nút Tạo/Xuất

// ❌ User sẽ KHÔNG thấy:
// - Trang Phát hiện mất rừng
// - Trang Quản lý người dùng
// - Tab "Dự báo tùy biến"
// - Nút "Tạo báo cáo", "Xuất báo cáo"
```

### Ví dụ 2: User có nhiều quyền

```javascript
// Role: data_manager
// Permissions: [
//   'data_management.forecast_search',
//   'data_management.satellite_search',
//   'data_management.verification',
//   'data_management.data_update',
//   'reports.view',
//   'reports.export'
// ]

// ✅ User sẽ thấy:
// - Sidebar: Quản lý dữ liệu, Báo cáo
// - Trang Quản lý dữ liệu: Tất cả 4 tabs
// - Trang Báo cáo: Xem và Xuất báo cáo

// ❌ User sẽ KHÔNG thấy:
// - Trang Dự báo mất rừng
// - Trang Phát hiện mất rừng
// - Nút "Tạo báo cáo" trong trang Báo cáo
```

---

## 🚀 Triển khai (Deployment)

### 1. Chạy migration và seed permissions

```bash
cd microservices/services/auth-service

# Chạy seed permissions mới
node prisma/seed-feature-based.js
```

### 2. Restart services

```bash
# Restart auth-service
pm2 restart auth-service

# Hoặc nếu dùng docker
docker-compose restart auth-service
```

### 3. Test permissions

```bash
# Login với admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Lấy token từ response

# Kiểm tra permissions
curl http://localhost:3001/api/auth/permissions/my-access \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🛠 Troubleshooting

### Vấn đề: User không thấy trang mặc dù có quyền

**Giải pháp:**
1. Kiểm tra JWT token có chứa đúng permissions không:
   ```javascript
   import { jwtDecode } from 'jwt-decode';
   const decoded = jwtDecode(localStorage.getItem('token'));
   console.log('Permissions:', decoded.permissions);
   ```

2. Clear localStorage và login lại:
   ```javascript
   localStorage.clear();
   window.location.href = '/login';
   ```

### Vấn đề: Sidebar không cập nhật khi thay đổi permissions

**Giải pháp:**
- Refresh token hoặc logout/login lại
- Permissions được cache trong JWT token, cần refresh để cập nhật

### Vấn đề: Feature bị ẩn mặc dù user là admin

**Giải pháp:**
- Kiểm tra `isAdmin()` function trong `AuthContext`
- Admin mặc định có tất cả quyền, không cần check permission cụ thể

---

## 📝 Best Practices

1. **Luôn sử dụng PageGuard cho toàn bộ trang**
   ```jsx
   <PageGuard pageKey="forecast">
     {/* Page content */}
   </PageGuard>
   ```

2. **Sử dụng FeatureGuard cho từng chức năng trong trang**
   ```jsx
   <FeatureGuard featureCode="forecast.auto">
     {/* Feature content */}
   </FeatureGuard>
   ```

3. **Đặt tên permission code rõ ràng**
   - Format: `{page}.{feature}`
   - Ví dụ: `data_management.verification`

4. **Gom nhóm permissions hợp lý khi tạo role**
   - Tránh gán quá nhiều permissions không liên quan
   - Tạo role theo chức vụ thực tế

5. **Test kỹ permissions trước khi deploy**
   - Tạo user test với từng role
   - Kiểm tra tất cả các trang và chức năng

---

## 📞 Hỗ trợ

Nếu gặp vấn đề hoặc cần hỗ trợ:
- Xem log trong: `microservices/services/auth-service/logs/`
- Check database: `psql -U postgres -d auth_db -c "SELECT * FROM \"Permission\""`
- Liên hệ team dev

---

## ✅ Checklist Triển khai

- [ ] Chạy seed permissions mới
- [ ] Restart auth-service
- [ ] Test login với admin
- [ ] Test API `/api/auth/permissions/my-access`
- [ ] Test UI với user có quyền hạn chế
- [ ] Cập nhật tài liệu nội bộ
- [ ] Đào tạo admin sử dụng hệ thống mới
