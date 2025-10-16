# Giai đoạn 0: Kết quả Nghiên cứu & Phân tích

Tài liệu này trình bày các nhiệm vụ nghiên cứu đã được thực hiện để xác định các cơ hội tái cấu trúc cụ thể trong toàn bộ dự án. Các phát hiện và quyết định đưa ra được tổng hợp tại đây.

## 1. Phân tích Phụ thuộc (Dependency Analysis)

- **Nhiệm vụ**: Đọc tất cả các tệp `package.json` trong `client`, `gateway`, và các `services`.
- **Mục tiêu**: Xác định sự không nhất quán, các gói đã lỗi thời, và sự không nhất quán trong các script.
- **Phát hiện**:
    - Dự án đang sử dụng chính xác NPM Workspaces để quản lý monorepo.
    - Có sự không nhất quán nhỏ về phiên bản của các phụ thuộc phát triển như `nodemon` (`^3.1.10` so với `^3.1.9`).
    - Các phụ thuộc chung như `cors` và `dotenv` được khai báo ở tệp `microservices/package.json` gốc nhưng cũng được khai báo lại trong từng dịch vụ riêng lẻ, điều này là thừa.
- **Quyết định**: Thực hiện một lượt dọn dẹp phụ thuộc. Thống nhất phiên bản của các phụ thuộc phát triển chung và loại bỏ các khai báo thừa trong các tệp `package.json` con, dựa vào cơ chế "hoisting" của workspace.

## 2. Phân tích Chất lượng & Tính nhất quán của Mã nguồn

- **Nhiệm vụ**: Đọc các tệp entry và mã nguồn đại diện từ `auth-service`, `gis-service`, `user-service`, và thư mục `shared`.
- **Mục tiêu**: Đánh giá tính nhất quán trong việc ghi log, xử lý lỗi, và các mẫu kiến trúc.
- **Phát hiện**:
    - **Điểm tích cực**: Sử dụng xuất sắc và nhất quán các mô-đun chia sẻ cho `DatabaseManager`, `errorHandler`, và `createLogger` (Winston) trên tất cả các dịch vụ đã phân tích (`auth`, `gis`, `user`).
    - **Vấn đề Kiến trúc Lớn**: `gis-service/src/index.js` khởi tạo một kết nối cơ sở dữ liệu *thứ hai* trực tiếp đến `auth_db` để truy vấn dữ liệu người dùng. Điều này tạo ra sự ghép nối chặt chẽ ở tầng cơ sở dữ liệu, là một anti-pattern trong kiến trúc microservices. Các dịch vụ nên giao tiếp với nhau qua các API được định nghĩa rõ ràng, không phải qua cơ sở dữ liệu chung.
- **Quyết định**: **Tái cấu trúc `gis-service` để loại bỏ kết nối trực tiếp đến `auth_db`**. Thay vào đó, nó sẽ thực hiện một cuộc gọi API đến một endpoint trên `auth-service` để lấy thông tin người dùng cần thiết. Điều này thực thi ranh giới dịch vụ và giảm sự ghép nối.

## 3. Phân tích API Gateway

- **Nhiệm vụ**: Phân tích sâu `gateway/src/index.js`.
- **Mục tiêu**: Đánh giá sự thừa thãi, không nhất quán trong việc ghi log, và tuân thủ các thực tiễn tốt nhất.
- **Phát hiện**:
    - **Không nhất quán trong Logging**: Gateway chỉ sử dụng `console.log` để ghi log, trong khi tất cả các dịch vụ khác sử dụng logger có cấu trúc `winston` được chia sẻ. Điều này làm cho việc ghi log tập trung và có cấu trúc trở nên không thể.
    - **Trùng lặp Mã nguồn**: Logic `on.proxyReq`, xử lý việc truyền lại body của request, được sao chép và dán cho gần như mọi route được proxy. Điều này rất thừa thãi và là một nguồn gây ra lỗi tiềm ẩn.
- **Quyết định 1**: **Tái cấu trúc API Gateway để sử dụng logger `winston` được chia sẻ**. Tất cả các câu lệnh `console.log` sẽ được thay thế bằng các cuộc gọi `logger.info`, `logger.error`, v.v. phù hợp.
- **Quyết định 2**: **Tạo một hàm trợ giúp proxy có thể tái sử dụng** bên trong gateway. Hàm này sẽ đóng gói logic chung cho `pathRewrite`, `timeout`, và việc truyền lại body `on.proxyReq`, giảm đáng kể sự trùng lặp mã nguồn.

## 4. Phân tích Tương tác Cơ sở dữ liệu

- **Nhiệm vụ**: Xem xét `shared/database/index.js` và cách sử dụng của nó.
- **Mục tiêu**: Xác nhận việc sử dụng nhất quán và chính xác của trình quản lý cơ sở dữ liệu.
- **Phát hiện**: Lớp `DatabaseManager` được triển khai tốt và được sử dụng nhất quán bởi tất cả các dịch vụ yêu cầu kết nối cơ sở dữ liệu. Không tìm thấy vấn đề nào ở đây, ngoài kết nối chéo dịch vụ đã đề cập ở điểm số 2.
- **Quyết định**: Không cần tái cấu trúc cho chính `DatabaseManager`. Công việc nằm ở việc thay đổi cách `gis-service` *sử dụng* nó.

## 5. Phân tích CI/CD Pipeline

- **Nhiệm vụ**: Xem xét `.github/workflows/ci-cd.yaml`.
- **Mục tiêu**: Xác định các tối ưu hóa tiềm năng và các thực tiễn bảo mật tốt nhất.
- **Phát hiện**: CI/CD pipeline được cấu trúc tốt. Nó thực hiện lint, test, build các ảnh Docker cho mỗi dịch vụ, và triển khai lên staging/production trên Kubernetes. Nó cũng bao gồm một bước quét bảo mật với Trivy. Việc sử dụng `cache-from` và `cache-to` cho các lớp Docker là một tối ưu hóa tốt.
- **Quyết định**: Không yêu cầu tái cấu trúc lớn cho CI/CD pipeline vào thời điểm này. Nó mạnh mẽ và tuân thủ các thực tiễn tốt.