# Tài liệu Database - Hệ thống Dự báo Mất Rừng

## Tổng quan

Hệ thống sử dụng PostgreSQL 17 với PostGIS extension cho xử lý dữ liệu không gian địa lý (GIS).

**Container Docker**: `QuanLyMatRungPostgres17`
- Port: 5433 (external) -> 5432 (internal)
- Image: postgis/postgis:17-3.5

---

## Các Database

Hệ thống gồm 3 database chính:

1. **auth_db** - Quản lý người dùng và xác thực
2. **gis_db** - Dữ liệu mất rừng và xác minh
3. **admin_db** - Dữ liệu hành chính và bản đồ nền

---

## 1. AUTH_DB - Database Xác thực và Người dùng

### 1.1. Table: `users`
**Mô tả**: Lưu trữ thông tin tài khoản người dùng và phân quyền

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả |
|-----|--------------|-----------|----------|-------|
| id | integer | PRIMARY KEY, NOT NULL | auto increment | ID người dùng |
| username | varchar(100) | UNIQUE, NOT NULL | | Tên đăng nhập (unique) |
| password_hash | varchar(255) | NOT NULL | | Mật khẩu đã mã hóa |
| full_name | varchar(255) | NOT NULL | | Họ và tên |
| role | varchar(20) | NOT NULL | 'user' | Vai trò: admin, user, viewer, manager |
| is_active | boolean | NOT NULL | true | Trạng thái hoạt động |
| created_at | timestamp | NOT NULL | CURRENT_TIMESTAMP | Thời gian tạo |
| last_login | timestamp | | | Thời gian đăng nhập cuối |
| district_id | varchar(50) | | NULL | Mã huyện quản lý |
| position | varchar(255) | NOT NULL | | Chức vụ |
| organization | varchar(255) | NOT NULL | | Đơn vị công tác |
| permission_level | varchar(50) | NOT NULL | 'district' | Cấp quyền: district, province, national |

**Indexes**:
- `users_pkey`: PRIMARY KEY trên id
- `users_username_key`: UNIQUE trên username
- `idx_users_username`: btree(username)
- `idx_users_role`: btree(role)
- `idx_users_is_active`: btree(is_active)
- `idx_users_district_id`: btree(district_id)

**Check Constraints**:
- `chk_role`: role phải là một trong ['admin', 'user', 'viewer', 'manager']
- `chk_permission`: permission_level phải là một trong ['district', 'province', 'national']

**Referenced By**:
- user_sessions.user_id (CASCADE DELETE)
- user_activity_log.user_id

---

### 1.2. Table: `user_sessions`
**Mô tả**: Quản lý phiên đăng nhập và JWT tokens

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả |
|-----|--------------|-----------|----------|-------|
| id | uuid | PRIMARY KEY, NOT NULL | uuid_generate_v4() | Session ID |
| user_id | integer | NOT NULL, FK | | ID người dùng |
| token_hash | varchar(255) | NOT NULL | | Token hash (JWT) |
| ip_address | inet | | | Địa chỉ IP |
| user_agent | text | | | User agent (browser info) |
| expires_at | timestamp | NOT NULL | | Thời gian hết hạn |
| created_at | timestamp | NOT NULL | CURRENT_TIMESTAMP | Thời gian tạo session |
| last_activity | timestamp | NOT NULL | CURRENT_TIMESTAMP | Hoạt động cuối cùng |

**Indexes**:
- `user_sessions_pkey`: PRIMARY KEY trên id
- `idx_sessions_user_id`: btree(user_id)
- `idx_sessions_token_hash`: btree(token_hash)
- `idx_sessions_expires_at`: btree(expires_at)

**Foreign Keys**:
- `fk_user`: user_id -> users(id) ON DELETE CASCADE

**Triggers**:
- `trigger_update_last_activity`: Tự động cập nhật last_activity khi UPDATE

---

### 1.3. Table: `user_activity_log`
**Mô tả**: Ghi log hoạt động của người dùng (audit trail)

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả |
|-----|--------------|-----------|----------|-------|
| id | integer | PRIMARY KEY, NOT NULL | auto increment | Log ID |
| user_id | integer | NOT NULL, FK | | ID người dùng |
| action | varchar(100) | NOT NULL | | Hành động thực hiện |
| resource | varchar(255) | | | Tài nguyên bị tác động |
| details | jsonb | | | Chi tiết bổ sung (JSON) |
| ip_address | inet | | | Địa chỉ IP |
| user_agent | text | | | User agent |
| created_at | timestamp | NOT NULL | CURRENT_TIMESTAMP | Thời gian ghi log |

**Indexes**:
- `user_activity_log_pkey`: PRIMARY KEY trên id
- `idx_activity_user_id`: btree(user_id)
- `idx_activity_action`: btree(action)
- `idx_activity_created_at`: btree(created_at DESC)

**Foreign Keys**:
- `fk_user_activity`: user_id -> users(id)

---

### 1.4. View: `v_active_users`
**Mô tả**: Hiển thị người dùng đang hoạt động và số phiên đăng nhập

**Columns**:
- id, username, full_name, role, organization, permission_level, last_login
- active_sessions (bigint): Số phiên đăng nhập còn hiệu lực

**Definition**:
```sql
SELECT u.id, u.username, u.full_name, u.role, u.organization,
       u.permission_level, u.last_login,
       COUNT(s.id) AS active_sessions
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.is_active = TRUE
GROUP BY u.id
```

---

## 2. GIS_DB - Database Dữ liệu Mất Rừng

### 2.1. Table: `mat_rung`
**Mô tả**: Dữ liệu phát hiện mất rừng với tọa độ không gian (geometry)

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả |
|-----|--------------|-----------|----------|-------|
| gid | integer | PRIMARY KEY, NOT NULL | auto increment | ID chính |
| start_sau | varchar(10) | | | Ngày bắt đầu (sau) |
| area | double precision | | | Diện tích (m²) |
| start_dau | varchar(10) | | | Ngày bắt đầu (đầu) |
| end_sau | varchar(10) | | | Ngày kết thúc (sau) |
| mahuyen | varchar(2) | | | Mã huyện |
| end_dau | varchar(10) | | | Ngày kết thúc (đầu) |
| geom | geometry(MultiPolygon,4326) | | | Vùng địa lý WGS84 |
| geom_simplified | geometry(MultiPolygon,4326) | | | Geometry đơn giản hóa (render nhanh) |
| detection_status | varchar(20) | CHECK | 'Chưa xác minh' | Trạng thái: Chưa xác minh, Đã xác minh, Từ chối, Đang xử lý |
| detection_date | date | | | Ngày phát hiện |
| verified_by | integer | | | User ID người xác minh (từ auth_db) |
| verified_area | double precision | | | Diện tích đã xác minh |
| verification_reason | varchar(100) | | | Lý do xác minh |
| verification_notes | text | | | Ghi chú xác minh |
| created_at | timestamp | | CURRENT_TIMESTAMP | Thời gian tạo |
| updated_at | timestamp | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Indexes**:
- `mat_rung_pkey`: PRIMARY KEY trên gid
- `idx_mat_rung_gid`: btree(gid)
- `idx_mat_rung_mahuyen`: btree(mahuyen)
- `idx_mat_rung_dates`: btree(start_dau, end_sau)
- `idx_mat_rung_composite`: btree(start_dau, end_sau, mahuyen)
- `idx_mat_rung_detection_status`: btree(detection_status)
- `idx_mat_rung_verified_by`: btree(verified_by) WHERE verified_by IS NOT NULL
- `idx_mat_rung_status_date`: btree(detection_status, detection_date DESC) WHERE detection_status = 'Đã xác minh'
- `idx_mat_rung_geom_gist`: gist(geom) - Index không gian
- `idx_mat_rung_geom_simplified_gist`: gist(geom_simplified)
- `idx_mat_rung_geom_3857`: gist(st_transform(geom, 3857))
- `idx_mat_rung_geom_gist_optimized`: gist(geom) WHERE st_isvalid(geom) AND geom IS NOT NULL

**Check Constraints**:
- `chk_detection_status`: detection_status phải là một trong ['Chưa xác minh', 'Đã xác minh', 'Từ chối', 'Đang xử lý']

**Triggers**:
- `set_area_in_hectares`: Tự động tính diện tích khi INSERT/UPDATE
- `trigger_log_verification_change`: Ghi log khi thay đổi trạng thái xác minh

**Referenced By**:
- mat_rung_verification_log.gid (CASCADE DELETE)

---

### 2.2. Table: `mat_rung_verification_log`
**Mô tả**: Log lịch sử xác minh mất rừng

| Cột | Kiểu dữ liệu | Ràng buộc | Mặc định | Mô tả |
|-----|--------------|-----------|----------|-------|
| id | integer | PRIMARY KEY, NOT NULL | auto increment | Log ID |
| gid | integer | NOT NULL, FK | | ID bản ghi mat_rung |
| action | varchar(50) | NOT NULL, CHECK | | Hành động: VERIFY, UPDATE_VERIFICATION, REJECT, RESET |
| old_status | varchar(50) | | | Trạng thái cũ |
| new_status | varchar(50) | | | Trạng thái mới |
| old_verified_area | double precision | | | Diện tích cũ |
| new_verified_area | double precision | | | Diện tích mới |
| old_verification_reason | varchar(100) | | | Lý do xác minh cũ |
| new_verification_reason | varchar(100) | | | Lý do xác minh mới |
| changed_by | integer | NOT NULL | | User ID người thực hiện |
| changed_at | timestamp | | CURRENT_TIMESTAMP | Thời gian thay đổi |
| client_ip | inet | | | Địa chỉ IP client |
| user_agent | text | | | User agent |

**Indexes**:
- `mat_rung_verification_log_pkey`: PRIMARY KEY trên id
- `idx_verification_log_gid`: btree(gid)
- `idx_verification_log_changed_by`: btree(changed_by)
- `idx_verification_log_changed_at`: btree(changed_at DESC)

**Check Constraints**:
- `chk_action`: action phải là một trong ['VERIFY', 'UPDATE_VERIFICATION', 'REJECT', 'RESET']

**Foreign Keys**:
- `fk_mat_rung`: gid -> mat_rung(gid) ON DELETE CASCADE

---

### 2.3. Table: `mat_rung_monthly_summary`
**Mô tả**: Tổng hợp dữ liệu mất rừng theo tháng và huyện

| Cột | Kiểu dữ liệu | Mô tả |
|-----|--------------|-------|
| month_year | timestamp with time zone | Tháng/năm |
| mahuyen | varchar(2) | Mã huyện |
| geom | geometry | Vùng địa lý |
| alert_count | bigint | Số cảnh báo |
| total_area | double precision | Tổng diện tích |
| avg_area | double precision | Diện tích trung bình |
| status_list | varchar[] | Danh sách trạng thái |

---

### 2.4. View: `v_mat_rung_optimized`
**Mô tả**: View tối ưu cho truy vấn nhanh dữ liệu mất rừng

**Columns**:
- gid, start_dau, end_sau, area, mahuyen, geom
- start_date (date): Chuyển đổi start_dau sang date
- end_date (date): Chuyển đổi end_sau sang date
- area_ha (numeric): Diện tích tính theo hecta
- detection_status, verified_by

**Definition**:
```sql
SELECT gid, start_dau, end_sau, area, mahuyen, geom,
       start_dau::date AS start_date,
       end_sau::date AS end_date,
       ROUND((area / 10000.0)::numeric, 2) AS area_ha,
       detection_status, verified_by
FROM mat_rung m
WHERE st_isvalid(geom) AND geom IS NOT NULL
```

---

### 2.5. Views: `verification_stats_by_status` và `verification_stats_by_reason`
**Mô tả**: Thống kê xác minh theo trạng thái và lý do

---

### 2.6. Table: `spatial_ref_sys`
**Mô tả**: Hệ tọa độ không gian (PostGIS standard table)
- Size: 6936 kB

---

## 3. ADMIN_DB - Database Hành chính và Bản đồ nền

### 3.1. Table: `laocai_huyen`
**Mô tả**: Ranh giới hành chính cấp huyện của Lào Cai

| Cột | Kiểu dữ liệu | Mô tả |
|-----|--------------|-------|
| gid | integer | PRIMARY KEY |
| objectid | double precision | Object ID |
| matinh | double precision | Mã tỉnh |
| tinh | varchar(30) | Tên tỉnh |
| huyen | varchar(30) | Tên huyện |
| sum_dtich | numeric | Tổng diện tích |
| shape_leng | numeric | Chu vi |
| shape_area | numeric | Diện tích hình dạng |
| mahuyen_1 | varchar(50) | Mã huyện phụ |
| geom | geometry(MultiPolygon,4326) | Vùng địa lý |

**Indexes**:
- `laocai_huyen_pkey`: PRIMARY KEY trên gid
- `idx_laocai_huyen_geom`: gist(geom)

**Size**: 1136 kB

---

### 3.2. Table: `laocai_chuquanly`
**Mô tả**: Đơn vị chủ quản lý rừng Lào Cai

| Cột | Kiểu dữ liệu | Mô tả |
|-----|--------------|-------|
| gid | integer | PRIMARY KEY |
| tt | integer | STT |
| chuquanly | varchar(50) | Tên chủ quản lý |
| geom | geometry(MultiPolygon,4326) | Vùng địa lý |
| geom_simplified | geometry(MultiPolygon,4326) | Geometry đơn giản hóa |

**Indexes**:
- `laocai_chuquanly_pkey`: PRIMARY KEY trên gid
- `idx_chuquanly_geom`: gist(geom)
- `idx_chuquanly_geom_simplified`: gist(geom_simplified)

**Size**: 275 MB (original), 520 kB (clustered)

---

### 3.3. Table: `laocai_rg3lr`
**Mô tả**: Phân loại rừng chi tiết theo hệ thống 3LR (3 loại rừng) cho Lào Cai

**Các cột chính**:
- gid: PRIMARY KEY
- matinh, mahuyen, maxa: Mã hành chính
- xa, huyen, tinh: Tên hành chính
- tk, khoanh, lo, thuad: Mã quản lý đất rừng
- ldlr (loại đất lâm nghiệp): Loại đất lâm nghiệp
- maldlr, malr3: Mã loại rừng
- dtich: Diện tích
- churung, machur: Chủ rừng
- mdsd, mamdsd: Mục đích sử dụng
- geom: geometry(MultiPolygon,4326)
- geom_simplified_low/medium/high: Geometry đơn giản hóa nhiều mức độ

**Indexes**:
- `laocai_rg3lr_pkey`: PRIMARY KEY trên gid
- `idx_rg3lr_geom`: gist(geom)
- `idx_rg3lr_geom_low/medium/high`: gist trên các mức độ đơn giản hóa
- `idx_rg3lr_ldlr`: btree(ldlr) WHERE ldlr IS NOT NULL

**Size**: 966 MB (original), 13 MB (clustered)

**Lưu ý**: Table này có 56 cột, chứa thông tin chi tiết về rừng theo tiêu chuẩn kiểm kê rừng Việt Nam (3LR system)

---

### 3.4. Tables khác:
- `laocai_chuquanly_clustered`: Bảng clustered tối ưu (520 kB)
- `laocai_nendiahinh`: Dữ liệu nền địa hình (6976 kB)
- `laocai_nendiahinh_line`: Đường nền địa hình (17 MB)
- `laocai_ranhgioihc`: Ranh giới hành chính nhiều mức chi tiết (26 MB)
- `laocai_rg3lr_clustered`: Bảng clustered tối ưu (13 MB)
- `tlaocai_tkk_3lr_cru`: Thống kê ranh giới hành chính với đơn vị quản lý rừng (139 MB)
- `spatial_ref_sys`: Hệ tọa độ (6936 kB)

---

## Quan hệ giữa các Database

### Cross-database References:
1. **mat_rung.verified_by** (gis_db) tham chiếu đến **users.id** (auth_db)
   - Không có foreign key constraint vật lý (cross-database)
   - Được xử lý ở application layer

2. **mat_rung_verification_log.changed_by** (gis_db) tham chiếu đến **users.id** (auth_db)
   - Không có foreign key constraint vật lý
   - Được xử lý ở application layer

3. **users.district_id** (auth_db) tham chiếu đến **laocai_huyen.mahuyen_1** (admin_db)
   - Không có foreign key constraint vật lý
   - Được xử lý ở application layer

---

## Kiến trúc Microservices

Dựa vào cấu trúc database, hệ thống sử dụng kiến trúc microservices với:

1. **Auth Service**: Sử dụng auth_db
   - Xác thực người dùng
   - Quản lý session và JWT tokens
   - Audit logging

2. **GIS Service**: Sử dụng gis_db
   - Quản lý dữ liệu mất rừng
   - Xác minh và theo dõi lịch sử
   - Phân tích không gian địa lý

3. **Admin Service**: Sử dụng admin_db
   - Dữ liệu hành chính
   - Bản đồ nền và ranh giới
   - Dữ liệu tham chiếu

---

## Tối ưu hóa

### Spatial Indexes:
- Tất cả geometry columns đều có GIST indexes
- Clustered tables cho truy vấn nhanh
- Simplified geometries cho rendering

### Query Optimization:
- Composite indexes trên các cột thường truy vấn cùng nhau
- Partial indexes cho điều kiện WHERE phổ biến
- Views tối ưu cho các truy vấn phức tạp

### Data Integrity:
- Check constraints cho enum-like values
- Triggers tự động cập nhật timestamps và tính toán
- Foreign keys với CASCADE DELETE khi phù hợp

---

## Backup và Maintenance

Khuyến nghị:
- Backup định kỳ tất cả 3 databases
- Vacuum và analyze định kỳ (đặc biệt cho spatial tables)
- Monitor index bloat và rebuild khi cần
- Kiểm tra geometry validity định kỳ

---

## Thông tin kết nối

**Connection Info**:
- Host: localhost
- Port: 5433
- Databases: auth_db, gis_db, admin_db
- User: postgres
- Extension: PostGIS 3.5

---

*Tài liệu được tạo tự động bởi Claude Code - Ngày cập nhật: 2025-10-11*
