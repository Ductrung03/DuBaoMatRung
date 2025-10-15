# Tài liệu Cơ sở dữ liệu

Tài liệu này được tạo tự động dựa trên việc truy vấn trực tiếp vào schema của các cơ sở dữ liệu. Nó mô tả chi tiết cấu trúc của các bảng, views, materialized views và các mối quan hệ trong hệ thống.

- **Ngày tạo:** 2025-10-15
- **Phương pháp:** Truy vấn `information_schema` và `pg_catalog` của PostgreSQL.

## Mục lục
1.  [Cơ sở dữ liệu `auth_db`](#cơ-sở-dữ-liệu-auth_db)
2.  [Cơ sở dữ liệu `gis_db`](#cơ-sở-dữ-liệu-gis_db)
3.  [Cơ sở dữ liệu `admin_db`](#cơ-sở-dữ-liệu-admin_db)

---

## Cơ sở dữ liệu `auth_db`

Cơ sở dữ liệu này chịu trách nhiệm quản lý người dùng, xác thực, phân quyền và ghi lại lịch sử hoạt động.

### Bảng (Tables)

#### `users`
Lưu trữ thông tin tài khoản người dùng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('users_id_seq') |
| username | character varying | NO | |
| password_hash | character varying | NO | |
| full_name | character varying | NO | |
| role | character varying | NO | 'user' |
| is_active | boolean | NO | true |
| created_at | timestamp | NO | CURRENT_TIMESTAMP |
| last_login | timestamp | YES | |
| district_id | character varying | YES | |
| position | character varying | NO | |
| organization | character varying | NO | |
| permission_level | character varying | NO | 'district' |

#### `user_sessions`
Quản lý các phiên đăng nhập của người dùng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | uuid | NO | uuid_generate_v4() |
| user_id | integer | NO | |
| token_hash | character varying | NO | |
| ip_address | inet | YES | |
| user_agent | text | YES | |
| expires_at | timestamp | NO | |
| created_at | timestamp | NO | CURRENT_TIMESTAMP |
| last_activity | timestamp | NO | CURRENT_TIMESTAMP |

#### `user_activity_log`
Ghi lại các hành động quan trọng của người dùng trong hệ thống.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('user_activity_log_id_seq') |
| user_id | integer | NO | |
| action | character varying | NO | |
| resource | character varying | YES | |
| details | jsonb | YES | |
| ip_address | inet | YES | |
| user_agent | text | YES | |
| created_at | timestamp | NO | CURRENT_TIMESTAMP |

### Views

#### `v_active_users`
Cung cấp thông tin tóm tắt về những người dùng đang hoạt động và số lượng phiên đăng nhập của họ.

**Định nghĩa:**
```sql
SELECT u.id,
    u.username,
    u.full_name,
    u.role,
    u.organization,
    u.permission_level,
    u.last_login,
    count(s.id) AS active_sessions
   FROM (users u
     LEFT JOIN user_sessions s ON (((u.id = s.user_id) AND (s.expires_at > now()))))
  WHERE (u.is_active = true)
  GROUP BY u.id;
```

### Mối quan hệ (Foreign Keys)

| Bảng nguồn | Cột nguồn | Bảng đích | Cột đích |
| :--- | :--- | :--- | :--- |
| `user_sessions` | `user_id` | `users` | `id` |
| `user_activity_log` | `user_id` | `users` | `id` |

---

## Cơ sở dữ liệu `gis_db`

Cơ sở dữ liệu này chứa tất cả dữ liệu không gian (GIS) liên quan đến việc phát hiện và quản lý mất rừng.

### Bảng (Tables)

#### `mat_rung`
Bảng chính lưu trữ các điểm phát hiện mất rừng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| gid | integer | NO | nextval('mat_rung_gid_seq') |
| start_sau | character varying | YES | |
| area | double precision | YES | |
| start_dau | character varying | YES | |
| end_sau | character varying | YES | |
| mahuyen | character varying | YES | |
| end_dau | character varying | YES | |
| geom | USER-DEFINED | YES | |
| geom_simplified | USER-DEFINED | YES | |
| detection_status | character varying | YES | 'Chưa xác minh' |
| detection_date | date | YES | |
| verified_by | integer | YES | |
| verified_area | double precision | YES | |
| verification_reason | character varying | YES | |
| verification_notes | text | YES | |
| created_at | timestamp | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP |

#### `mat_rung_verification_log`
Ghi lại lịch sử các lần xác minh thông tin mất rừng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('mat_rung_verification_log_id_seq') |
| gid | integer | NO | |
| action | character varying | NO | |
| old_status | character varying | YES | |
| new_status | character varying | YES | |
| old_verified_area | double precision | YES | |
| new_verified_area | double precision | YES | |
| old_verification_reason | character varying | YES | |
| new_verification_reason | character varying | YES | |
| changed_by | integer | NO | |
| changed_at | timestamp | YES | CURRENT_TIMESTAMP |
| client_ip | inet | YES | |
| user_agent | text | YES | |

#### `mat_rung_monthly_summary`
Bảng tổng hợp dữ liệu mất rừng theo tháng và huyện.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| month_year | timestamp with time zone | YES | |
| mahuyen | character varying | YES | |
| geom | USER-DEFINED | YES | |
| alert_count | bigint | YES | |
| total_area | double precision | YES | |
| avg_area | double precision | YES | |
| status_list | ARRAY | YES | |

*(Lưu ý: Các bảng hệ thống của PostGIS như `spatial_ref_sys`, `geography_columns`, `geometry_columns` không được liệt kê chi tiết ở đây.)*

### Views

#### `v_mat_rung_optimized`
View tối ưu hóa của bảng `mat_rung`, tính toán sẵn một số trường và đảm bảo `geom` hợp lệ.

**Định nghĩa:**
```sql
SELECT gid,
    start_dau,
    end_sau,
    area,
    mahuyen,
    geom,
    (start_dau)::date AS start_date,
    (end_sau)::date AS end_date,
    round(((area / (10000.0)::double precision))::numeric, 2) AS area_ha,
    detection_status,
    verified_by
   FROM mat_rung m
  WHERE (st_isvalid(geom) AND (geom IS NOT NULL));
```

#### `verification_stats_by_status`
View thống kê số liệu xác minh dựa trên `detection_status`.

**Định nghĩa:**
```sql
SELECT detection_status,
    count(*) AS total_cases,
    (sum(area) / (10000.0)::double precision) AS total_area_ha,
    (avg(area) / (10000.0)::double precision) AS avg_area_ha,
    min(detection_date) AS first_case,
    max(detection_date) AS last_case
   FROM mat_rung
  WHERE (detection_status IS NOT NULL)
  GROUP BY detection_status
  ORDER BY (count(*)) DESC;
```

#### `verification_stats_by_reason`
View thống kê số liệu xác minh dựa trên `verification_reason` (lý do xác minh).

**Định nghĩa:**
```sql
SELECT verification_reason,
    count(*) AS total_cases,
    (sum(area) / (10000.0)::double precision) AS total_area_ha,
    (avg(area) / (10000.0)::double precision) AS avg_area_ha,
    min(detection_date) AS first_case,
    max(detection_date) AS last_case
   FROM mat_rung
  WHERE (((detection_status)::text = 'Đã xác minh'::text) AND (verification_reason IS NOT NULL))
  GROUP BY verification_reason
  ORDER BY (count(*)) DESC;
```

### Mối quan hệ (Foreign Keys)

| Bảng nguồn | Cột nguồn | Bảng đích | Cột đích |
| :--- | :--- | :--- | :--- |
| `mat_rung_verification_log` | `gid` | `mat_rung` | `gid` |

---

## Cơ sở dữ liệu `admin_db`

Cơ sở dữ liệu này chứa các dữ liệu nền, dữ liệu hành chính và các bảng tra cứu (lookup tables) phục vụ cho toàn bộ hệ thống.

### Bảng (Tables)

#### `laocai_huyen`
Ranh giới hành chính các huyện của tỉnh Lào Cai.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| gid | integer | NO | nextval('laocai_huyen_gid_seq') |
| objectid | double precision | YES | |
| matinh | double precision | YES | |
| tinh | character varying | YES | |
| huyen | character varying | YES | |
| sum_dtich | numeric | YES | |
| shape_leng | numeric | YES | |
| shape_area | numeric | YES | |
| mahuyen_1 | character varying | YES | |
| geom | USER-DEFINED | YES | |

#### `laocai_ranhgioihc`
Ranh giới hành chính chi tiết (tiểu khu, khoảnh).

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| gid | integer | NO | nextval('laocai_ranhgioihc_gid_seq') |
| huyen | character varying | YES | |
| xa | character varying | YES | |
| tieukhu | character varying | YES | |
| khoanh | character varying | YES | |
| geom | USER-DEFINED | YES | |
| geom_low | USER-DEFINED | YES | |
| geom_high | USER-DEFINED | YES | |

#### `laocai_rg3lr`
Dữ liệu quy hoạch 3 loại rừng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| gid | integer | NO | nextval('laocai_rg3lr_gid_seq') |
| dtich | double precision | YES | |
| ldlr | character varying | YES | |
| malr3 | smallint | YES | |
| mdsd | character varying | YES | |
| churung | character varying | YES | |
| huyen | character varying | YES | |
| xa | character varying | YES | |
| ... | ... | ... | ... |
| geom | USER-DEFINED | YES | |

*(Bảng `laocai_rg3lr` có rất nhiều cột, chỉ một số cột chính được liệt kê ở đây.)*

#### `laocai_chuquanly`
Thông tin về chủ quản lý.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| gid | integer | NO | nextval('laocai_chuquanly_gid_seq') |
| tt | integer | YES | |
| chuquanly | character varying | YES | |
| geom | USER-DEFINED | YES | |
| geom_simplified | USER-DEFINED | YES | |

#### `chuc_nang_rung`
Bảng tra cứu chức năng rừng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('chuc_nang_rung_id_seq') |
| ma_chuc_nang | character varying | NO | |
| ten_chuc_nang | character varying | NO | |
| mo_ta | text | YES | |
| created_at | timestamp | YES | CURRENT_TIMESTAMP |

#### `nguyen_nhan`
Bảng tra cứu nguyên nhân mất rừng.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('nguyen_nhan_id_seq') |
| ma_nguyen_nhan | character varying | NO | |
| ten_nguyen_nhan | character varying | NO | |
| mo_ta | text | YES | |
| created_at | timestamp | YES | CURRENT_TIMESTAMP |

#### `trang_thai_xac_minh`
Bảng tra cứu các trạng thái xác minh.

| Cột | Kiểu dữ liệu | Cho phép NULL | Mặc định |
| :--- | :--- | :--- | :--- |
| id | integer | NO | nextval('trang_thai_xac_minh_id_seq') |
| ma_trang_thai | character varying | NO | |
| ten_trang_thai | character varying | NO | |
| mo_ta | text | YES | |
| created_at | timestamp | YES | CURRENT_TIMESTAMP |

*(Lưu ý: Các bảng khác như `laocai_nendiahinh`, `laocai_nendiahinh_line`, `laocai_chuquanly_clustered`, `laocai_rg3lr_clustered` không được liệt kê chi tiết.)*

### Materialized Views

Đây là các view được tính toán trước để tăng tốc độ truy vấn, thường dùng cho các bộ lọc dropdown trên giao diện người dùng.

- **`mv_huyen`**: Liệt kê các huyện duy nhất.
- **`mv_xa_by_huyen`**: Liệt kê các xã duy nhất theo từng huyện.
- **`mv_tieukhu_by_xa`**: Liệt kê các tiểu khu duy nhất theo xã.
- **`mv_khoanh_by_tieukhu`**: Liệt kê các khoảnh duy nhất theo tiểu khu.
- **`mv_churung`**: Liệt kê các chủ rừng duy nhất.

### Mối quan hệ (Foreign Keys)

Cơ sở dữ liệu `admin_db` không có các ràng buộc foreign key được định nghĩa ở cấp độ schema. Các mối quan hệ được quản lý ở tầng ứng dụng.