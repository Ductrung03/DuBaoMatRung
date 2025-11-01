# Kế hoạch Nhiệm vụ: Tái cấu trúc và Tối ưu hóa Toàn bộ Dự án

**Tóm tắt**: Danh sách các nhiệm vụ có thể thực thi được, được tạo ra từ các tài liệu thiết kế để cải thiện kiến trúc và chất lượng mã nguồn của dự án.

## Giai đoạn 1: Nhiệm vụ Nền tảng (Dọn dẹp phụ thuộc)

**Mục tiêu**: Dọn dẹp và thống nhất các phụ thuộc trong toàn bộ monorepo để cải thiện tính nhất quán.

- [X] T001 [P] [US3] Hợp nhất các phiên bản `nodemon` trong tất cả các tệp `package.json` có liên quan.
- [X] T002 [P] [US3] Xóa các khai báo `cors` và `dotenv` thừa khỏi các tệp `package.json` của từng dịch vụ.

## Giai đoạn 2: Tái cấu trúc API Gateway

**Mục tiêu**: Cải thiện chất lượng mã nguồn, khả năng bảo trì và ghi log của API Gateway.
**Kiểm tra độc lập**: Sau giai đoạn này, gateway phải hoạt động như cũ, nhưng mã nguồn phải gọn hơn và log phải được ghi bởi Winston.

- [X] T003 [US2] Trong `microservices/gateway/src/index.js`, khởi tạo logger Winston được chia sẻ từ `../../shared/logger`.
- [X] T004 [US2] Thay thế tất cả các lệnh `console.log` trong `microservices/gateway/src/index.js` bằng logger đã khởi tạo.
- [X] T005 [US2] Tạo một hàm trợ giúp `createProxy(target, pathRewriteOptions)` trong `microservices/gateway/src/proxy-helper.js` để đóng gói logic tạo proxy middleware.
- [X] T006 [US2] Tái cấu trúc tất cả các lệnh gọi `app.use(createProxyMiddleware(...))` trong `microservices/gateway/src/index.js` để sử dụng hàm trợ giúp `createProxy` mới.

## Giai đoạn 3: Tái cấu trúc Kiến trúc (Tách rời Dịch vụ)

**Mục tiêu**: Loại bỏ kết nối trực tiếp từ `gis-service` đến `auth_db`, thay thế bằng giao tiếp qua API.
**Kiểm tra độc lập**: Sau giai đoạn này, các chức năng của `gis-service` liên quan đến thông tin người dùng phải hoạt động bình thường.

- [X] T007 [US1] Trong `auth-service`, tạo tệp route mới tại `microservices/services/auth-service/src/routes/internal.routes.js`.
- [X] T008 [US1] Trong `auth-service`, triển khai logic cho endpoint `GET /internal/user-info` trong một controller mới để lấy thông tin người dùng theo danh sách ID.
- [X] T009 [US1] Trong `auth-service`, thêm một middleware bảo mật để bảo vệ endpoint `/internal/` bằng cách kiểm tra một API key nội bộ từ biến môi trường.
- [X] T010 [US1] Trong `gis-service`, tạo một client API mới tại `microservices/services/gis-service/src/services/authServiceClient.js` để gọi đến endpoint mới của `auth-service`.
- [X] T011 [US1] Trong `gis-service/src/index.js`, loại bỏ việc khởi tạo `authDbManager` và kết nối đến `auth_db`.
- [X] T012 [US1] Tìm và thay thế tất cả các đoạn mã trong `gis-service` đang truy vấn trực tiếp đến `authDbManager` bằng cách gọi hàm trong `authServiceClient.js` mới.

## Giai đoạn 4: Hoàn thiện & Kiểm tra

**Mục tiêu**: Đảm bảo toàn bộ hệ thống hoạt động ổn định và không có lỗi nào được tạo ra.

- [X] T013 Chạy tất cả các bộ test của dự án (`npm run test --workspaces`) và đảm bảo tất cả đều vượt qua.
- [X] T014 Thực hiện kiểm tra thủ công các luồng nghiệp vụ chính bị ảnh hưởng, đặc biệt là các chức năng trong `gis-service` có hiển thị thông tin người dùng (như `verified_by`).
- [X] T015 Xem lại log của API Gateway và các dịch vụ để xác nhận rằng chúng được ghi lại bởi Winston với định dạng JSON có cấu trúc.

## Thứ tự Phụ thuộc & Thực thi Song song

- **Thứ tự**: Giai đoạn 1 (Nền tảng) → Giai đoạn 2 (Gateway) → Giai đoạn 3 (Kiến trúc) → Giai đoạn 4 (Kiểm tra).
- **Song song**: 
  - Các nhiệm vụ trong Giai đoạn 1 có thể được thực hiện song song.
  - Giai đoạn 2 và Giai đoạn 3 về mặt lý thuyết có thể được thực hiện song song với nhau.
  - Các nhiệm vụ được đánh dấu `[P]` có thể được làm song song trong cùng một giai đoạn.

## Chiến lược Triển khai

1.  **MVP (Sản phẩm Khả thi Tối thiểu)**: Hoàn thành Giai đoạn 1 và 2. Điều này mang lại giá trị ngay lập tức bằng cách cải thiện chất lượng mã nguồn của Gateway và dọn dẹp dự án.
2.  **Giao hàng Tăng dần**: Hoàn thành Giai đoạn 3. Đây là thay đổi kiến trúc lớn nhất và quan trọng nhất.
3.  **Hoàn thiện**: Hoàn thành Giai đoạn 4 để đảm bảo chất lượng trước khi hợp nhất (merge).