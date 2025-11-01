# Feature Specification: Tối ưu hóa CSDL và Phân quyền (Kiến trúc "Tự Host")

**Feature Branch**: `003-db-auth-optimization`  
**Status**: **Finalized**

## 1. Blueprint Kiến trúc Tối ưu ("Tự Host")

Đây là kiến trúc cuối cùng, đáp ứng các tiêu chí: tối ưu, hiệu quả, clean, dễ bảo trì, chuẩn microservice và **không phát sinh chi phí ngoài server hiện có**.

- **PostgreSQL + Kysely (cho dữ liệu GIS):** Giữ nguyên các CSDL PostGIS trên server hiện tại. `gis-service` và `admin-service` sẽ sử dụng **Kysely Query Builder** để xây dựng truy vấn một cách an toàn, thay cho việc viết SQL thuần bằng tay.
- **Prisma + PostgreSQL (cho dữ liệu Auth):** `auth_db` được giữ nguyên trên PostgreSQL. `auth-service` sẽ sử dụng **Prisma** làm ORM để hiện đại hóa và triển khai hệ thống phân quyền RBAC mới.
- **MongoDB trong Docker (cho dữ liệu Log):** Toàn bộ nhật ký hoạt động sẽ được chuyển sang một CSDL **MongoDB chạy trong Docker container** ngay trên server hiện tại.
- **Giao tiếp qua API:** Mọi giao tiếp giữa các service **PHẢI** được thực hiện qua API. Liên kết trực tiếp giữa các CSDL (Foreign Data Wrapper) sẽ bị **loại bỏ hoàn toàn**.

---

## 2. Yêu cầu Chức năng Chi tiết (Theo Kiến trúc "Tự Host")

### **Component: Authentication & Authorization (`auth-service`)**
- **FR-001**: `auth-service` PHẢI tích hợp **Prisma** làm ORM để kết nối tới `auth_db`.
- **FR-002**: Cấu trúc phân quyền trong `auth_db` PHẢI được xây dựng lại theo mô hình RBAC (`users`, `roles`, `permissions`, `user_roles`, `role_permissions`).

### **Component: Logging**
- **FR-003**: Một container **MongoDB Docker** PHẢI được thiết lập và chạy trên server hiện tại.
- **FR-004**: Bảng `user_activity_log` PHẢI được xóa khỏi `auth_db`.
- **FR-005**: Một cơ chế (ví dụ: `logging-service`) PHẢI được tạo để nhận và ghi log vào CSDL MongoDB trong Docker.

### **Component: GIS & Admin Data (`gis-service`, `admin-service`)**
- **FR-006**: `gis-service` và `admin-service` PHẢI được tái cấu trúc để sử dụng **Kysely Query Builder** cho tất cả các truy vấn tới CSDL PostGIS của chúng.
- **FR-007**: Liên kết CSDL bằng Foreign Data Wrapper (FDW) giữa `gis_db` và `admin_db` PHẢI được **loại bỏ hoàn toàn**.
- **FR-008**: Mọi giao tiếp giữa các service (ví dụ: `gis-service` cần dữ liệu người dùng) PHẢI được thực hiện thông qua việc gọi API tới service tương ứng (ví dụ: `auth-service`).
- **FR-009**: Các service `gis-service` và `admin-service` PHẢI tự xây dựng các API endpoint của mình (sử dụng Express.js) để cung cấp dữ liệu GIS cho frontend.

---

## 3. Mô hình Dữ liệu & Thực thể

- **Trong `auth_db` (PostgreSQL + Prisma):**
  - `User`, `Role`, `Permission`, `UserRole`, `RolePermission`.
- **Trong `gis_db` & `admin_db` (PostgreSQL + Kysely):**
  - `mat_rung`, `laocai_huyen`, `laocai_ranhgioihc` và các bảng GIS khác được giữ nguyên tại chỗ.
- **Trong `MongoDB` (Docker):**
  - `activity_logs` (collection).

---

## 4. Tiêu chí Thành công

- **SC-001**: Hệ thống phân quyền RBAC mới hoạt động chính xác.
- **SC-002**: Toàn bộ chức năng GIS hoạt động ổn định, với `gis-service` và `admin-service` sử dụng Kysely để truy vấn CSDL.
- **SC-003**: **Không còn Foreign Data Wrapper (FDW)**. Giao tiếp giữa các service được thực hiện 100% qua API.
- **SC-004**: Hệ thống ghi log vào MongoDB (chạy trong Docker) hoạt động ổn định.
- **SC-005**: Mã nguồn của các service trở nên "clean" và dễ bảo trì hơn: `auth-service` dùng Prisma, `gis-service`/`admin-service` dùng Kysely.
