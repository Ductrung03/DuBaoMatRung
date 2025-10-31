# Hướng dẫn Hệ thống Phân quyền Mới V2

## Tổng quan

Hệ thống phân quyền mới được thiết kế theo cấu trúc **Trang → Chức năng** như yêu cầu:

- **Trang**: Các trang chính của hệ thống (Dự báo mất rừng, Quản lý dữ liệu, v.v.)
- **Chức năng**: Các tính năng cụ thể trong mỗi trang
- **Phân quyền chi tiết**: Người dùng chỉ thấy những trang và chức năng được phân quyền

## Cấu trúc Trang và Chức năng

### 1. Trang Dự báo mất rừng (`forecast`)
- ✅ Dự báo mất rừng tự động (`forecast.auto`)
- ✅ Dự báo mất rừng tùy biến (`forecast.custom`)

### 2. Trang Quản lý dữ liệu (`data_management`)
- ✅ Tra cứu dữ liệu dự báo mất rừng (`data_management.forecast_lookup`)
- ✅ Tra cứu dữ liệu ảnh vệ tinh (`data_management.satellite_lookup`)
- ✅ Xác minh dự báo mất rừng (`data_management.verification`)
- ✅ Cập nhật dữ liệu (`data_management.update`)

### 3. Trang Báo cáo (`reports`)
- ✅ Xem báo cáo (`reports.view`)
- ✅ Tạo báo cáo (`reports.create`)
- ✅ Xuất báo cáo (`reports.export`)

### 4. Trang Phát hiện mất rừng (`detection`)
- ✅ Xem phát hiện mất rừng (`detection.view`)
- ✅ Phân tích phát hiện (`detection.analyze`)

### 5. Trang Quản lý người dùng (`user_management`)
- ✅ Xem danh sách người dùng (`user_management.view`)
- ✅ Tạo người dùng (`user_management.create`)
- ✅ Chỉnh sửa người dùng (`user_management.edit`)
- ✅ Xóa người dùng (`user_management.delete`)

### 6. Trang Quản lý vai trò (`role_management`)
- ✅ Xem danh sách vai trò (`role_management.view`)
- ✅ Tạo vai trò (`role_management.create`)
- ✅ Chỉnh sửa vai trò (`role_management.edit`)
- ✅ Phân quyền vai trò (`role_management.assign_permissions`)

## Cài đặt và Triển khai

### Bước 1: Chạy Script Setup

```bash
# Từ thư mục gốc dự án
./setup-new-permissions.sh
```

### Bước 2: Cập nhật Auth Service

Thêm routes mới vào `microservices/services/auth-service/src/app.js`:

```javascript
// Thêm import
const pagePermissionRoutes = require('./routes/pagePermissionRoutes');

// Thêm route
app.use('/api/auth/page-permissions', pagePermissionRoutes);
```

### Bước 3: Khởi động lại Auth Service

```bash
cd microservices/services/auth-service
npm start
```

### Bước 4: Cập nhật Frontend

#### 4.1 Cập nhật App.jsx để sử dụng components mới:

```jsx
// Thay thế imports
import SidebarNew from './dashboard/layout/SidebarNew';
import { PageGuardNew, FeatureGuardNew } from './components/PermissionGuardNew';
import { useFeaturePermissionsNew } from './hooks/useFeaturePermissionsNew';

// Sử dụng SidebarNew
<SidebarNew />
```

#### 4.2 Cập nhật Route Management:

```jsx
import QuanLyRoleNew from './dashboard/pages/QuanLyRoleNew';

// Thay thế component cũ
<Route path="/dashboard/quanly-role" element={<QuanLyRoleNew />} />
```

#### 4.3 Bảo vệ các trang:

```jsx
import { PageGuardNew } from '../components/PermissionGuardNew';

// Bảo vệ trang
<PageGuardNew pageKey="forecast">
  <DuBaoMatRungPage />
</PageGuardNew>
```

#### 4.4 Bảo vệ các chức năng:

```jsx
import { FeatureGuardNew } from '../components/PermissionGuardNew';

// Bảo vệ chức năng
<FeatureGuardNew featureCode="forecast.custom">
  <CustomForecastButton />
</FeatureGuardNew>
```

## API Endpoints Mới

### 1. Lấy permissions của user hiện tại
```
GET /api/auth/page-permissions/my-access
```

### 2. Lấy tất cả trang và chức năng (admin)
```
GET /api/auth/page-permissions/all-pages-features
```

### 3. Kiểm tra quyền truy cập trang
```
GET /api/auth/page-permissions/check-page/:pageKey
```

### 4. Kiểm tra quyền truy cập chức năng
```
GET /api/auth/page-permissions/check-feature/:featureCode
```

## Sử dụng trong Code

### Hook useFeaturePermissionsNew

```jsx
import { useFeaturePermissionsNew } from '../hooks/useFeaturePermissionsNew';

function MyComponent() {
  const { 
    hasPageAccess, 
    hasFeatureAccess, 
    shouldShowFeature,
    getPageFeatures 
  } = useFeaturePermissionsNew();

  // Kiểm tra quyền trang
  if (!hasPageAccess('forecast')) {
    return <div>Không có quyền truy cập</div>;
  }

  // Kiểm tra quyền chức năng
  const canUseCustomForecast = hasFeatureAccess('forecast.custom');

  return (
    <div>
      {canUseCustomForecast && <CustomForecastButton />}
    </div>
  );
}
```

### Component Guards

```jsx
import { PageGuardNew, FeatureGuardNew, ConditionalRenderNew } from '../components/PermissionGuardNew';

// Bảo vệ toàn bộ trang
<PageGuardNew pageKey="data_management">
  <DataManagementPage />
</PageGuardNew>

// Bảo vệ chức năng cụ thể
<FeatureGuardNew featureCode="data_management.update">
  <UpdateDataButton />
</FeatureGuardNew>

// Hiển thị có điều kiện
<ConditionalRenderNew featureCode="reports.export">
  <ExportButton />
</ConditionalRenderNew>
```

### Hook usePermissionCheck

```jsx
import { usePermissionCheck } from '../components/PermissionGuardNew';

function ComplexComponent() {
  const { checkPermission } = usePermissionCheck();

  // Kiểm tra nhiều điều kiện
  const canManageData = checkPermission({
    featureCodes: ['data_management.update', 'data_management.verification'],
    requireAll: false // Chỉ cần 1 trong 2
  });

  const canFullAccess = checkPermission({
    pageKey: 'user_management',
    featureCode: 'user_management.delete',
    requireAll: true // Cần cả 2
  });

  return (
    <div>
      {canManageData && <DataManagementTools />}
      {canFullAccess && <DeleteUserButton />}
    </div>
  );
}
```

## Roles Mẫu

Hệ thống tạo sẵn các role mẫu:

### 1. Admin
- Có tất cả quyền
- Không bị giới hạn bởi permissions

### 2. Người xem
- Chỉ xem dữ liệu cơ bản
- Permissions: `forecast.auto`, `data_management.forecast_lookup`, `reports.view`

### 3. Chuyên viên dự báo
- Sử dụng đầy đủ tính năng dự báo
- Permissions: `forecast.*`, `data_management.*` (trừ update), `reports.*`, `detection.*`

### 4. Quản lý dữ liệu
- Quản lý và cập nhật dữ liệu
- Permissions: `data_management.*`, `reports.*`

## Quản lý Permissions

### Giao diện Phân quyền Mới

1. **Truy cập**: `/dashboard/quanly-role` (sử dụng `QuanLyRoleNew`)
2. **Cấu trúc**: Hiển thị theo trang → chức năng
3. **Tính năng**:
   - Tích vào trang để cấp quyền toàn bộ trang
   - Tích vào chức năng cụ thể để cấp quyền từng phần
   - Hiển thị trạng thái: Toàn quyền / Một phần / Không có quyền
   - Giao diện trực quan với icons và mô tả

### Cách Phân quyền

1. **Chọn Role** → Click "Phân quyền"
2. **Chọn Trang**: Tích vào tên trang để cấp quyền truy cập
3. **Chọn Chức năng**: Mở rộng trang và tích vào các chức năng cụ thể
4. **Lưu**: Click "Lưu phân quyền"

### Logic Phân quyền

- **Tích trang**: Tự động tích tất cả chức năng trong trang
- **Bỏ tích trang**: Tự động bỏ tích tất cả chức năng
- **Tích chức năng**: Tự động tích trang (nếu chưa tích)
- **Bỏ tích chức năng**: Nếu không còn chức năng nào thì bỏ tích trang

## Testing

### Test Phân quyền

1. **Tạo user test** với role khác nhau
2. **Đăng nhập** và kiểm tra:
   - Sidebar chỉ hiển thị trang được phép
   - Trong trang chỉ hiển thị chức năng được phép
   - Truy cập trực tiếp URL bị chặn nếu không có quyền

### Test Cases

```javascript
// Test hasPageAccess
expect(hasPageAccess('forecast')).toBe(true);
expect(hasPageAccess('admin_only_page')).toBe(false);

// Test hasFeatureAccess
expect(hasFeatureAccess('forecast.auto')).toBe(true);
expect(hasFeatureAccess('forecast.custom')).toBe(false);

// Test sidebar visibility
expect(shouldShowInSidebar('data_management')).toBe(true);
```

## Troubleshooting

### Lỗi thường gặp

1. **Sidebar không hiển thị trang**
   - Kiểm tra user có role với quyền `page.{pageKey}`
   - Kiểm tra API `/api/auth/page-permissions/my-access`

2. **Chức năng bị ẩn**
   - Kiểm tra user có quyền feature cụ thể
   - Kiểm tra code sử dụng đúng `featureCode`

3. **Admin không thấy gì**
   - Kiểm tra `isAdmin()` function
   - Admin bypass tất cả permission checks

### Debug

```javascript
// Debug permissions
const { getAllAccessibleFeatures } = useFeaturePermissionsNew();
console.log('User permissions:', getAllAccessibleFeatures());

// Debug API
fetch('/api/auth/page-permissions/my-access')
  .then(res => res.json())
  .then(data => console.log('API response:', data));
```

## Migration từ Hệ thống Cũ

### Bước 1: Backup
```bash
# Backup database
pg_dump your_database > backup_before_migration.sql
```

### Bước 2: Chạy Migration
```bash
./setup-new-permissions.sh
```

### Bước 3: Update Code
- Thay thế `useFeaturePermissions` → `useFeaturePermissionsNew`
- Thay thế `PermissionGuard` → `PermissionGuardNew`
- Update routes và components

### Bước 4: Test
- Test với các role khác nhau
- Verify permissions hoạt động đúng
- Check performance

## Kết luận

Hệ thống phân quyền mới cung cấp:

✅ **Phân quyền chi tiết** theo trang và chức năng  
✅ **Giao diện trực quan** để quản lý permissions  
✅ **API mạnh mẽ** để kiểm tra quyền  
✅ **Components bảo vệ** dễ sử dụng  
✅ **Performance tốt** với caching  
✅ **Tương thích** với hệ thống hiện tại  

Người dùng giờ đây chỉ thấy những gì họ được phép truy cập, tạo trải nghiệm sử dụng tốt hơn và bảo mật cao hơn.
