# Đặc tả Mô hình Dữ liệu

**Lưu ý**: Tài liệu này mô tả mô hình dữ liệu hiện có của hệ thống. Không có thay đổi nào đối với mô hình dữ liệu được đề xuất trong nhiệm vụ tái cấu trúc này, nhằm tuân thủ ràng buộc "không thay đổi logic chức năng". Tài liệu này đóng vai trò là một tài liệu tham chiếu cơ sở.

## Tổng quan

Hệ thống sử dụng ba cơ sở dữ liệu PostgreSQL riêng biệt:
1.  `auth_db`: Quản lý người dùng, xác thực và quyền hạn.
2.  `gis_db`: Lưu trữ tất cả dữ liệu GIS và không gian cốt lõi liên quan đến mất rừng.
3.  `admin_db`: Chứa ranh giới hành chính và các dữ liệu tra cứu khác.

---

## 1. `auth_db`

Quản lý tài khoản người dùng, các phiên làm việc và nhật ký hoạt động.

### Các bảng chính

- **`users`**: Lưu trữ thông tin hồ sơ người dùng.
  - `id`: integer (Khóa chính)
  - `username`: character varying
  - `password_hash`: character varying
  - `full_name`: character varying
  - `role`: character varying
  - `organization`: character varying

- **`user_sessions`**: Quản lý các phiên đăng nhập và token của người dùng.
  - `id`: uuid (Khóa chính)
  - `user_id`: integer (Khóa ngoại tới users.id)
  - `token_hash`: character varying
  - `expires_at`: timestamp

---

## 2. `gis_db`

Lưu trữ dữ liệu hoạt động cốt lõi liên quan đến việc phát hiện và xác minh mất rừng.

### Các bảng chính

- **`mat_rung`**: Bảng chính cho các sự kiện mất rừng được phát hiện.
  - `gid`: integer (Khóa chính)
  - `area`: double precision
  - `mahuyen`: character varying
  - `geom`: USER-DEFINED (PostGIS Geometry)
  - `detection_status`: character varying
  - `verified_by`: integer (Đại diện cho một ID người dùng từ `auth_db`)

- **`mat_rung_verification_log`**: Ghi lại lịch sử các hành động xác minh trên các bản ghi `mat_rung`.
  - `id`: integer (Khóa chính)
  - `gid`: integer (Khóa ngoại tới mat_rung.gid)
  - `action`: character varying
  - `changed_by`: integer (Đại diện cho một ID người dùng từ `auth_db`)

---

## 3. `admin_db`

Chứa dữ liệu GIS hành chính và các bảng tra cứu.

### Các bảng chính

- **`laocai_huyen`**: Ranh giới hành chính cho các huyện.
  - `gid`: integer (Khóa chính)
  - `huyen`: character varying
  - `geom`: USER-DEFINED (PostGIS Geometry)

- **`laocai_ranhgioihc`**: Ranh giới hành chính chi tiết.
  - `gid`: integer (Khóa chính)
  - `huyen`: character varying
  - `xa`: character varying
  - `geom`: USER-DEFINED (PostGIS Geometry)

- **Bảng tra cứu (Lookup Tables)**: `chuc_nang_rung`, `nguyen_nhan`, `trang_thai_xac_minh`, v.v., cung cấp các giá trị cho các dropdown và phân loại.