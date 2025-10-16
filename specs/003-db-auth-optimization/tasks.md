# Kế hoạch Triển khai: Tối ưu hóa CSDL và Phân quyền (Kiến trúc "Tự Host")

**Feature**: `003-db-auth-optimization`
**Spec**: [spec.md](./spec.md)

Đây là danh sách các công việc cụ thể, được sắp xếp theo thứ tự ưu tiên và phụ thuộc, để triển khai kiến trúc "Tự Host".

## Implementation Strategy

Chúng ta sẽ triển khai theo từng giai đoạn, ưu tiên các thay đổi về nền tảng trước. Mỗi User Story sẽ được hoàn thành như một phần tăng trưởng độc lập, có thể kiểm thử được.

- **MVP (Sản phẩm khả thi tối thiểu)**: Hoàn thành Giai đoạn 1 và 2. Tại thời điểm này, hệ thống phân quyền mới sẽ hoạt động hoàn toàn.
- **Incremental Delivery**: Các giai đoạn tiếp theo có thể được thực hiện song song hoặc tuần tự.

## Dependencies

- **US1 (RBAC)**: Phụ thuộc vào Giai đoạn 1.
- **US2 (GIS)**: Phụ thuộc vào Giai đoạn 1.
- **US3 (Logging)**: Phụ thuộc vào Giai đoạn 1.

---

## Giai đoạn 1: Thiết lập Môi trường "Tự Host"
*Mục tiêu: Cài đặt các công cụ cần thiết và xác nhận môi trường hiện có.*

- [X] T001 Xác nhận container Docker `mongodb` đang chạy và mở cổng 27017 bằng lệnh `docker ps`.
- [X] T002 Cập nhật file `.env.example` trong các thư mục `microservices/services/*` với biến môi trường `MONGODB_URI="mongodb://localhost:27017/logging_db"`.
- [X] T003 [P] Cài đặt `kysely` và `pg` trong `microservices/services/gis-service/` bằng lệnh `npm install kysely pg`.
- [X] T004 [P] Cài đặt `kysely` và `pg` trong `microservices/services/admin-service/` bằng lệnh `npm install kysely pg`.

## Giai đoạn 2: User Story 1 - Tái cấu trúc Phân quyền (RBAC)
*Mục tiêu: Hoàn thiện hệ thống phân quyền mới trong `auth-service`.*

- [X] T005 [US1] Cập nhật file `microservices/services/auth-service/package.json` để thêm `prisma` và `@prisma/client`.
- [X] T006 [US1] Tạo file `microservices/services/auth-service/prisma/schema.prisma` và định nghĩa các model `User`, `Role`, `Permission`.
- [X] T007 [US1] Chạy lệnh `npx prisma migrate dev --name "init-rbac"` để tạo các bảng mới trong `auth_db`.
- [X] T008 [US1] Tái cấu trúc mã nguồn trong `microservices/services/auth-service/src/` để sử dụng Prisma Client cho tất cả các thao tác CSDL.
- [X] T009 [US1] [P] Implement các API endpoint mới để quản lý Roles và Permissions trong `microservices/services/auth-service/src/routes/`.

## Giai đoạn 3: User Story 3 - Tái cấu trúc Logging
*Mục tiêu: Chuyển hệ thống ghi log sang container MongoDB có sẵn.*

- [X] T010 [US3] Cập nhật file `microservices/gateway/package.json` (hoặc tạo service mới) để thêm driver `mongodb`.
- [X] T011 [US3] Tạo một module/middleware mới trong `microservices/gateway/src/` để xử lý việc gửi log đến MongoDB.
- [X] T012 [US3] Implement logic cho endpoint `POST /logs` để nhận và ghi log.
- [X] T013 [US3] Xóa bảng `user_activity_log` và các logic liên quan khỏi `auth-service`.
- [X] T014 [US3] [P] Thêm các lệnh gọi đến endpoint `POST /logs` tại các vị trí cần thiết trong các service khác.

## Giai đoạn 4: User Story 2 - Tái cấu trúc GIS
*Mục tiêu: Hướng các service GIS và Admin sang sử dụng Kysely và loại bỏ FDW.*

- [X] T015 [US2] Trong `gis-service` và `admin-service`, tạo các file định nghĩa kiểu (type definition) cho các bảng CSDL để Kysely sử dụng.
- [X] T016 [US2] Tái cấu trúc mã nguồn truy cập CSDL trong `microservices/services/gis-service/src/` để sử dụng Kysely Query Builder.
- [X] T017 [US2] Tái cấu trúc mã nguồn truy cập CSDL trong `microservices/services/admin-service/src/` để sử dụng Kysely Query Builder.
- [X] T018 [US2] **[QUAN TRỌNG]** Xóa bỏ cấu hình Foreign Data Wrapper (FDW) trực tiếp trong CSDL PostgreSQL. (Không còn sử dụng FDW vì đã chuyển sang Kysely và giao tiếp qua API)
- [X] T019 [US2] [P] Xây dựng các API endpoint (Express.js) cần thiết trong `gis-service` để cung cấp dữ liệu `mat_rung` cho frontend.
- [X] T020 [US2] [P] Xây dựng các API endpoint (Express.js) cần thiết trong `admin-service` để cung cấp dữ liệu ranh giới hành chính cho frontend.
- [X] T021 [US2] Cập nhật code frontend trong `client/src/` để gọi đến các API mới này thay vì các API cũ. (Không cần thay đổi vì API endpoints giữ nguyên, chỉ backend được refactor)

## Giai đoạn 5: Hoàn thiện và Tích hợp
*Mục tiêu: Dọn dẹp, kiểm thử và hoàn tất quá trình tái cấu trúc.*

- [X] T022 [P] Viết kịch bản kiểm thử end-to-end cho các luồng chính (đăng nhập -> xem bản đồ -> cập nhật -> ghi log).
- [X] T023 Rà soát và xóa bỏ tất cả các đoạn mã, cấu hình CSDL cũ không còn được sử dụng.
- [X] T024 Cập nhật tài liệu `README.md` của dự án để phản ánh kiến trúc mới và cách thiết lập môi trường.
