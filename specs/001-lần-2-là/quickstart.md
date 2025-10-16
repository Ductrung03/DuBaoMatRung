# Hướng dẫn Bắt đầu Nhanh

Tài liệu này cung cấp hướng dẫn về cách thiết lập và chạy dự án cục bộ. Các nhiệm vụ tái cấu trúc không làm thay đổi quy trình khởi động phát triển.

## Yêu cầu cần có

- Node.js (v18 trở lên)
- npm (v9 trở lên)
- Docker và Docker Compose (cho cơ sở dữ liệu và các dịch vụ khác)

## 1. Cài đặt

Sao chép (clone) repository và cài đặt tất cả các phụ thuộc bằng NPM workspaces. Chạy lệnh này từ thư mục gốc của dự án:

```bash
npm install
```

Lệnh này sẽ cài đặt các phụ thuộc cho `client`, `microservices` workspace, và tất cả các dịch vụ riêng lẻ.

## 2. Biến Môi trường

Mỗi dịch vụ và gateway đều sử dụng tệp `.env` để cấu hình. Bạn sẽ cần tạo một tệp `.env` trong các thư mục sau đây dựa trên các tệp `.env.example` hoặc `.env.template` tương ứng của chúng:

- `/microservices/gateway/.env`
- `/microservices/services/auth-service/.env`
- `/microservices/services/gis-service/.env`
- `/microservices/services/user-service/.env`
- ... (và tương tự cho tất cả các dịch vụ)

Hãy đảm bảo rằng thông tin đăng nhập cơ sở dữ liệu và URL dịch vụ được cấu hình chính xác.

## 3. Chạy Hệ thống

Để chạy toàn bộ hệ thống (tất cả các microservice và client frontend) ở chế độ phát triển với tính năng tự động tải lại (hot-reloading), hãy sử dụng lệnh sau từ thư mục gốc của dự án:

```bash
npm run dev
```

Lệnh này sử dụng `concurrently` để khởi động:
- API Gateway.
- Tất cả các microservice riêng lẻ.
- Máy chủ phát triển frontend React.

- **API Gateway** sẽ có sẵn tại `http://localhost:3000`.
- **Frontend** sẽ có sẵn tại `http://localhost:5173` (hoặc một cổng khác do Vite chỉ định).