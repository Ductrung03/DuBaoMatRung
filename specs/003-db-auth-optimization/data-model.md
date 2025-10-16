# Mô hình Dữ liệu (Kiến trúc "Tự Host")

**Tính năng**: Tối ưu hóa CSDL và Phân quyền
**Ngày**: 2025-10-16

Tài liệu này phác thảo các mô hình dữ liệu cho ba hệ thống cơ sở dữ liệu trong kiến trúc "Tự Host" mới.

---

## 1. CSDL Xác thực (PostgreSQL + Prisma)

**Vị trí**: `auth-service`, chạy trên CSDL PostgreSQL hiện tại.

### `User` (Người dùng)
- `id` (Int, Khóa chính, Tự động tăng)
- `username` (String, Duy nhất)
- `password_hash` (String)
- `full_name` (String)
- `is_active` (Boolean, mặc định: `true`)
- `created_at` (DateTime, mặc định: `now()`)
- `last_login` (DateTime, có thể null)
- `roles` (Quan hệ, Nhiều-nhiều với `Role`)

### `Role` (Vai trò)
- `id` (Int, Khóa chính, Tự động tăng)
- `name` (String, Duy nhất) - *Ví dụ: "admin", "gis_specialist", "district_manager"*
- `description` (String, có thể null)
- `users` (Quan hệ, Nhiều-nhiều với `User`)
- `permissions` (Quan hệ, Nhiều-nhiều với `Permission`)

### `Permission` (Quyền)
- `id` (Int, Khóa chính, Tự động tăng)
- `action` (String) - *Ví dụ: "manage", "create", "read", "update", "delete"*
- `subject` (String) - *Ví dụ: "users", "reports", "deforestation_events"*
- `description` (String, có thể null)
- `roles` (Quan hệ, Nhiều-nhiều với `Role`)
- **Ràng buộc**: `@@unique([action, subject])`

*Ghi chú: Các mối quan hệ nhiều-nhiều sẽ được quản lý bởi Prisma, công cụ này sẽ tự động tạo ra các bảng trung gian `_UserRoles` và `_RolePermissions`.*

---

## 2. CSDL GIS (PostgreSQL + Kysely)

**Vị trí**: `gis_db` và `admin_db` trên server PostgreSQL hiện tại. Sẽ được truy cập bởi `gis-service` và `admin-service` bằng Kysely.

Cơ sở dữ liệu này giữ nguyên cấu trúc hiện tại, nhưng sẽ được truy cập theo cách mới.

### `mat_rung` (Sự kiện mất rừng)
- `gid` (Int, Khóa chính)
- `geom` (Geometry, MultiPolygon, 4326) - *Dữ liệu không gian chính*
- `detection_status` (String) - *Ví dụ: "Chưa xác minh", "Đã xác minh"*
- `detection_date` (Date)
- `verified_by` (Int) - *ID người dùng từ CSDL Auth. Đây không còn là khóa ngoại, chỉ là một ID số nguyên.*
- ... (và các trường hiện có khác)

### `laocai_huyen` (Ranh giới huyện)
- `gid` (Int, Khóa chính)
- `geom` (Geometry, MultiPolygon, 4326)
- `huyen` (String)
- `tinh` (String)
- ... (và các trường hành chính khác)

*... và tất cả các bảng khác trong `gis_db` và `admin_db` được giữ nguyên.*

---

## 3. CSDL Logging (MongoDB trong Docker)

**Vị trí**: Chạy trong một Docker container trên server hiện tại, được truy cập bởi `logging-service`.

### `activity_logs` (Collection)
Collection này sẽ lưu trữ các document với schema linh hoạt.

- `_id` (ObjectId, Khóa chính)
- `timestamp` (ISODate, Được đánh chỉ mục)
- `userId` (Int, Được đánh chỉ mục) - *ID của người dùng thực hiện hành động.*
- `service` (String, Được đánh chỉ mục) - *Service đã tạo ra log, ví dụ: "auth-service", "gis-service".*
- `action` (String, Được đánh chỉ mục) - *Mã cho hành động, ví dụ: "USER_LOGIN", "UPDATE_VERIFICATION_STATUS".*
- `ipAddress` (String, có thể null)
- `details` (Object) - *Một đối tượng linh hoạt chứa bất kỳ dữ liệu ngữ cảnh bổ sung nào cho sự kiện.*
