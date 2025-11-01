# HỆ THỐNG BÁO CÁO THỐNG KÊ MẤT RỪNG

## Tổng quan

Hệ thống báo cáo được thiết kế để tạo ra 2 loại báo cáo chính theo yêu cầu:

### Loại 1: Bảng thống kê phát hiện sớm mất rừng (toàn bộ)
- **Tiêu đề**: BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG
- **Dữ liệu**: Tất cả các vị trí được phát hiện (bao gồm cả chưa xác minh và đã xác minh)
- **Diện tích**: Sử dụng cột `dtich`
- **Cột hiển thị**: TT, Xã, Lô cảnh báo, Tiểu khu, Khoảnh, Tọa độ X, Tọa độ Y, Diện tích (ha)

### Loại 2: Bảng thống kê vị trí mất rừng (đã xác minh)
- **Tiêu đề**: BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG
- **Dữ liệu**: Chỉ các vị trí đã được xác minh (xacminh=1)
- **Diện tích**: Sử dụng cột `dtichXM`
- **Cột hiển thị**: TT, Xã, Lô cảnh báo, Tiểu khu, Khoảnh, Tọa độ X, Tọa độ Y, Diện tích (ha), Nguyên nhân

## Cấu trúc Components

### 1. ReportTypeSelector
**File**: `client/src/components/ReportTypeSelector.jsx`

Component form để người dùng chọn:
- Thời gian báo cáo (bắt buộc)
- Khu vực (Huyện, Xã) - tùy chọn
- Loại báo cáo (1 hoặc 2)
- Định dạng hiển thị (Bảng văn bản hoặc Biểu đồ)

### 2. ReportGenerator
**File**: `client/src/components/ReportGenerator.jsx`

Component hiển thị báo cáo dạng bảng với:
- Header thông tin (Tỉnh, Huyện, Xã, Thời gian)
- Bảng dữ liệu với các cột phù hợp theo loại báo cáo
- Dòng tổng kết
- Footer với thông tin người tổng hợp và ghi chú
- Nút xuất DOCX và PDF

### 3. ReportManager
**File**: `client/src/pages/ReportManager.jsx`

Trang chính quản lý việc tạo báo cáo:
- Sử dụng ReportTypeSelector để nhận input
- Chuyển hướng đến trang hiển thị báo cáo với params

### 4. ThongKeBaoCaoMatRung (Cập nhật)
**File**: `client/src/dashboard/pages/ThongKeBaoCaoMatRung.jsx`

Trang hiển thị báo cáo được cập nhật để:
- Sử dụng ReportGenerator cho báo cáo dạng bảng
- Giữ nguyên logic biểu đồ
- Xử lý params từ URL

## Routing

```javascript
// Trang tạo báo cáo mới
/dashboard/tao-bao-cao -> ReportManager

// Trang hiển thị báo cáo
/dashboard/thong-ke-bao-cao-mat-rung -> ThongKeBaoCaoMatRung

// Redirect từ route cũ
/dashboard/baocao -> redirect to /dashboard/tao-bao-cao
```

## Cách sử dụng

### 1. Tạo báo cáo mới
1. Truy cập `/dashboard/tao-bao-cao`
2. Chọn thời gian (bắt buộc)
3. Chọn khu vực (tùy chọn)
4. Chọn loại báo cáo (1 hoặc 2)
5. Chọn định dạng hiển thị
6. Nhấn "Tạo báo cáo"

### 2. Xem báo cáo
- Hệ thống sẽ chuyển đến trang hiển thị báo cáo với dữ liệu phù hợp
- Có thể xuất DOCX hoặc xem/lưu PDF

## Tính năng chính

### ✅ Đã hoàn thành
- [x] Form tạo báo cáo với validation
- [x] 2 loại báo cáo theo đúng yêu cầu
- [x] Hiển thị bảng với format chuẩn
- [x] Tính toán tổng số lô và diện tích
- [x] Làm tròn tọa độ X,Y
- [x] Sử dụng đúng cột diện tích (dtich vs dtichXM)
- [x] Cột "Nguyên nhân" chỉ hiển thị ở Loại 2
- [x] Header và footer theo đúng format
- [x] Nút xuất DOCX và PDF
- [x] Responsive design

### 🔄 Cần backend hỗ trợ
- [ ] API endpoint `/api/bao-cao/export-docx`
- [ ] API endpoint `/api/bao-cao/export-pdf`
- [ ] API lọc dữ liệu theo params (fromDate, toDate, huyen, xa, xacMinh)

## Demo

Để test các component, có thể sử dụng:
```javascript
import ReportDemo from './demo/ReportDemo';
// Component này có dữ liệu mẫu để test
```

## Lưu ý kỹ thuật

### Validation
- Thời gian là bắt buộc
- Ngày bắt đầu phải nhỏ hơn ngày kết thúc
- Khu vực là tùy chọn

### Xử lý dữ liệu
- Loại 1: Lấy tất cả dữ liệu (xacMinh=false)
- Loại 2: Chỉ lấy dữ liệu đã xác minh (xacMinh=true)
- Diện tích được chuyển từ m² sang ha (chia 10000)
- Tọa độ được làm tròn (Math.round)

### URL Parameters
```
fromDate: YYYY-MM-DD
toDate: YYYY-MM-DD  
huyen: string (optional)
xa: string (optional)
xacMinh: 'true' | 'false'
type: 'Văn bản' | 'Biểu đồ'
```

## Cấu trúc file

```
client/src/
├── components/
│   ├── ReportTypeSelector.jsx    # Form tạo báo cáo
│   └── ReportGenerator.jsx       # Hiển thị báo cáo bảng
├── pages/
│   └── ReportManager.jsx         # Trang quản lý báo cáo
├── dashboard/pages/
│   └── ThongKeBaoCaoMatRung.jsx  # Trang hiển thị (cập nhật)
└── demo/
    └── ReportDemo.jsx            # Demo với dữ liệu mẫu
```

## Tích hợp với hệ thống hiện tại

Các component mới được thiết kế để tích hợp dễ dàng:
- Sử dụng ReportContext hiện có
- Tương thích với AuthContext và PermissionProtectedRoute
- Sử dụng toast notifications hiện có
- Tuân theo design system hiện tại (Tailwind CSS)
