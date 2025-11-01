# HƯỚNG DẪN HỆ THỐNG PHÂN QUYỀN MỚI - CẬP NHẬT

## 📋 Tổng quan

Hệ thống phân quyền đã được cập nhật theo yêu cầu của bạn với cấu trúc **TRANG → CHỨC NĂNG** đơn giản và trực quan.

### 🎯 Nguyên tắc hoạt động:

1. **Phân quyền theo trang**: Mỗi trang trong ứng dụng có các chức năng cụ thể
2. **Hiển thị có điều kiện**: Chỉ hiển thị những trang/chức năng mà user có quyền
3. **UI phân quyền trực quan**: Tích checkbox theo trang và chức năng

---

## 📁 Cấu trúc Phân quyền Mới

### 1. **Trang Dự báo mất rừng** (`forecast`)
- ✅ `forecast.auto` - Dự báo mất rừng tự động
- ✅ `forecast.custom` - Dự báo mất rừng tùy biến

### 2. **Trang Quản lý dữ liệu** (`data_management`)
- ✅ `data_management.forecast_search` - Tra cứu dữ liệu dự báo mất rừng
- ✅ `data_management.satellite_search` - Tra cứu dữ liệu ảnh vệ tinh
- ✅ `data_management.verification` - Xác minh dự báo mất rừng
- ✅ `data_management.data_update` - Cập nhật dữ liệu

### 3. **Trang Báo cáo** (`reports`)
- ✅ `reports.view` - Xem báo cáo

### 4. **Trang Phát hiện mất rừng** (`detection`)
- ✅ `detection.view` - Xem phát hiện mất rừng

### 5. **Trang Quản lý người dùng** (`user_management`)
- ✅ `user_management.view` - Xem danh sách người dùng

### 6. **Trang Quản lý role** (`role_management`)
- ✅ `role_management.view` - Xem danh sách vai trò và phân quyền

---

## 🎨 Giao diện Phân quyền Mới

### Trang Quản lý Role

Giao diện phân quyền được thiết kế theo dạng tree với checkbox:

```
📊 Dự báo mất rừng
  ☑️ Dự báo mất rừng tự động
  ☑️ Dự báo mất rừng tùy biến

🗄️ Quản lý dữ liệu  
  ☑️ Tra cứu dữ liệu dự báo mất rừng
  ☑️ Tra cứu dữ liệu ảnh vệ tinh
  ☐ Xác minh dự báo mất rừng
  ☐ Cập nhật dữ liệu

📄 Báo cáo
  ☑️ Xem báo cáo

⚠️ Phát hiện mất rừng
  ☐ Xem phát hiện mất rừng

👥 Quản lý người dùng
  ☐ Xem danh sách người dùng

🛡️ Quản lý vai trò
  ☐ Xem danh sách vai trò
```

### Tính năng:
- **Checkbox trang**: Tích/bỏ tích toàn bộ chức năng trong trang
- **Checkbox chức năng**: Tích/bỏ tích từng chức năng cụ thể
- **Trạng thái indeterminate**: Hiển thị khi trang có một số chức năng được chọn
- **Màu sắc phân biệt**: Mỗi trang có màu icon riêng
- **Mô tả chi tiết**: Hiển thị mô tả và UI element của từng chức năng

---

## 🔧 API Endpoints Mới

### 1. Lấy cấu trúc permissions cho UI quản lý role

```bash
GET /api/auth/permissions/role-management-tree
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "forecast",
      "name": "Dự báo mất rừng",
      "description": "Trang dự báo mất rừng với các chức năng tự động và tùy biến",
      "icon": "FaChartLine",
      "path": "/dashboard/dubaomatrung",
      "color": "#10B981",
      "type": "page",
      "children": [
        {
          "key": "auto",
          "code": "forecast.auto",
          "name": "Dự báo mất rừng tự động",
          "description": "Sử dụng AI/ML để dự báo tự động các khu vực có nguy cơ mất rừng",
          "ui_element": "Tab \"Dự báo tự động\", Form nhập tham số, Nút \"Chạy dự báo\", Kết quả dự báo",
          "type": "feature",
          "permission_id": 1,
          "parent_page": "forecast"
        }
      ]
    }
  ],
  "total_pages": 6,
  "total_features": 10
}
```

### 2. Lấy quyền của user hiện tại

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
        "icon": "FaChartLine",
        "color": "#10B981",
        "features": [
          {
            "key": "auto",
            "code": "forecast.auto",
            "name": "Dự báo mất rừng tự động",
            "description": "...",
            "ui_element": "..."
          }
        ]
      }
    ],
    "total_permissions": 5
  }
}
```

---

## 🚀 Cách sử dụng

### 1. Chạy seed để cập nhật database

```bash
cd microservices/services/auth-service
DATABASE_URL="postgresql://postgres:4@localhost:5433/auth_db?schema=public" node prisma/seed-feature-based.js
```

### 2. Test API endpoints

```bash
# Login để lấy token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Test API lấy cấu trúc permissions
curl http://localhost:3001/api/auth/permissions/role-management-tree \
  -H "Authorization: Bearer <TOKEN>"

# Test API lấy quyền user
curl http://localhost:3001/api/auth/permissions/my-access \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Sử dụng component React

```jsx
// Import component
import RoleManagement from './pages/Admin/RoleManagement';
import PermissionTest from './pages/Admin/PermissionTest';

// Sử dụng trong route
<Route path="/admin/roles" component={RoleManagement} />
<Route path="/admin/permission-test" component={PermissionTest} />
```

---

## 📊 Roles mẫu đã tạo

### 1. **super_admin** - Toàn quyền
- Tất cả permissions

### 2. **admin** - Quản trị viên
- Tất cả permissions

### 3. **forecast_specialist** - Chuyên viên dự báo
- `forecast.auto`
- `forecast.custom`

### 4. **data_manager** - Quản lý dữ liệu
- `data_management.forecast_search`
- `data_management.satellite_search`
- `data_management.verification`
- `data_management.data_update`

### 5. **reporter** - Người báo cáo
- `reports.view`

### 6. **detector** - Người phát hiện
- `detection.view`

### 7. **user_admin** - Quản trị người dùng
- `user_management.view`

### 8. **role_admin** - Quản trị vai trò
- `role_management.view`

### 9. **viewer** - Người xem
- `forecast.auto`
- `data_management.forecast_search`
- `reports.view`

---

## 🎯 Ví dụ thực tế

### Ví dụ 1: User chỉ có quyền dự báo

```javascript
// Role: forecast_specialist
// Permissions: ['forecast.auto', 'forecast.custom']

// ✅ User sẽ thấy:
// - Sidebar: Chỉ có "Dự báo mất rừng"
// - Trang Dự báo: Cả 2 tab "Tự động" và "Tùy biến"

// ❌ User sẽ KHÔNG thấy:
// - Trang Quản lý dữ liệu
// - Trang Báo cáo
// - Trang Phát hiện mất rừng
// - Trang Quản lý người dùng
// - Trang Quản lý role
```

### Ví dụ 2: User có quyền quản lý dữ liệu

```javascript
// Role: data_manager
// Permissions: [
//   'data_management.forecast_search',
//   'data_management.satellite_search',
//   'data_management.verification',
//   'data_management.data_update'
// ]

// ✅ User sẽ thấy:
// - Sidebar: Chỉ có "Quản lý dữ liệu"
// - Trang Quản lý dữ liệu: Tất cả 4 tabs
//   + Tra cứu dữ liệu dự báo mất rừng
//   + Tra cứu dữ liệu ảnh vệ tinh
//   + Xác minh dự báo mất rừng
//   + Cập nhật dữ liệu

// ❌ User sẽ KHÔNG thấy:
// - Trang Dự báo mất rừng
// - Trang Báo cáo
// - Các trang khác
```

---

## 🛠 Tính năng UI Quản lý Role

### 1. **Danh sách roles**
- Hiển thị tất cả roles với thông tin cơ bản
- Số lượng permissions của mỗi role
- Trạng thái hoạt động
- Nút chỉnh sửa/xóa

### 2. **Modal tạo/sửa role**
- Form nhập tên và mô tả role
- Tree view permissions với checkbox
- Checkbox trang: Tích/bỏ tích toàn bộ chức năng
- Checkbox chức năng: Tích/bỏ tích từng chức năng
- Hiển thị mô tả chi tiết của từng chức năng

### 3. **Tính năng nâng cao**
- Indeterminate state cho checkbox trang
- Màu sắc phân biệt từng trang
- Icon đại diện cho từng trang
- Mô tả UI element chi tiết

---

## 🔍 Component Test

Component `PermissionTest` giúp:
- Xem cấu trúc permissions tree
- Kiểm tra quyền của user hiện tại
- Debug API response
- So sánh quyền có/không có

---

## ✅ Checklist Triển khai

- [x] Cập nhật config permissions theo yêu cầu
- [x] Tạo seed data với roles mẫu
- [x] Tạo API endpoint cho UI quản lý role
- [x] Tạo component React quản lý role
- [x] Tạo component test permissions
- [x] Viết tài liệu hướng dẫn

### Cần làm tiếp:
- [ ] Tích hợp vào routing chính
- [ ] Test với các user khác nhau
- [ ] Cập nhật middleware kiểm tra quyền
- [ ] Tạo component PageGuard và FeatureGuard
- [ ] Deploy và test production

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra log auth-service: `microservices/services/auth-service/logs/`
2. Test API bằng curl hoặc Postman
3. Sử dụng component PermissionTest để debug
4. Kiểm tra database: `SELECT * FROM "Permission" WHERE is_active = true;`

---

## 🎉 Kết luận

Hệ thống phân quyền mới đã được thiết kế theo đúng yêu cầu:

✅ **Phân quyền theo trang và chức năng**
✅ **UI checkbox trực quan**  
✅ **Tích trang → tích tất cả chức năng**
✅ **Tích chức năng → chỉ hiển thị chức năng đó**
✅ **API endpoints hoàn chỉnh**
✅ **Components React sẵn sàng**

Bạn có thể bắt đầu sử dụng ngay bằng cách chạy seed và test các API endpoints!
