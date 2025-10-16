# Kế hoạch Triển khai: Tái cấu trúc và Tối ưu hóa Toàn bộ Dự án

**Nhánh**: `001-lần-2-là` | **Ngày**: 2025-10-16 | **Đặc tả**: [spec.md](./spec.md)
**Đầu vào**: Đặc tả tính năng từ `/specs/001-lần-2-là/spec.md`

## Tóm tắt

Nhiệm vụ này sẽ tái cấu trúc và tối ưu hóa toàn bộ dự án microservices "DuBaoMatRung" mà không làm thay đổi logic chức năng. Kế hoạch kỹ thuật tập trung vào ba lĩnh vực chính được xác định trong [tệp nghiên cứu](./research.md):

1.  **Tái cấu trúc kiến trúc:** Tách rời sự phụ thuộc tầng dữ liệu giữa `gis-service` và `auth-service` bằng cách chuyển sang giao tiếp qua API.
2.  **Dọn dẹp mã nguồn Gateway:** Chuẩn hóa việc ghi log và loại bỏ mã proxy trùng lặp.
3.  **Dọn dẹp phụ thuộc:** Hợp nhất các phiên bản phụ thuộc và loại bỏ các khai báo thừa.

## Bối cảnh Kỹ thuật

**Ngôn ngữ/Phiên bản**: Node.js v18 (Backend), JavaScript/React (Frontend với Vite)
**Các phụ thuộc chính**: Express.js, `pg` (node-postgres), `http-proxy-middleware`, React, Leaflet
**Lưu trữ**: PostgreSQL (3 cơ sở dữ liệu: `auth_db`, `gis_db`, `admin_db`), Redis để caching
**Kiểm thử**: Jest (dựa trên `package.json` và CI pipeline)
**Nền tảng Mục tiêu**: Linux server (triển khai qua Docker & Kubernetes)
**Loại Dự án**: Ứng dụng Web (frontend + backend microservices)
**Mục tiêu Hiệu suất**: Duy trì hoặc cải thiện thời gian phản hồi API hiện có sau khi tái cấu trúc.
**Ràng buộc**: **Không được thay đổi logic chức năng hiện có.** Tất cả các thay đổi phải tập trung vào cấu trúc, chất lượng mã và hiệu suất.
**Quy mô/Phạm vi**: 7 microservices, 1 API Gateway, 1 ứng dụng frontend.

## Kiểm tra Quy ước (Constitution Check)

*CỔNG KIỂM TRA: Phải vượt qua trước khi nghiên cứu Giai đoạn 0. Kiểm tra lại sau khi thiết kế Giai đoạn 1.*

- **[ĐẠT]** Kế hoạch này tuân thủ nghiêm ngặt ràng buộc chính của người dùng: không thay đổi logic chức năng. Các nhiệm vụ tái cấu trúc được thiết kế để cải thiện các khía cạnh phi chức năng (bảo trì, hiệu suất, cấu trúc) trong khi vẫn giữ nguyên hành vi của hệ thống.

## Cấu trúc Dự án

### Tài liệu (cho tính năng này)

```
specs/001-lần-2-là/
├── plan.md              # Tệp này (đầu ra của lệnh /speckit.plan)
├── research.md          # Đầu ra Giai đoạn 0 (/speckit.plan)
├── data-model.md        # Đầu ra Giai đoạn 1 (/speckit.plan)
├── contracts/           # Đầu ra Giai đoạn 1 (/speckit.plan)
└── quickstart.md        # Đầu ra Giai đoạn 1 (/speckit.plan)
```

### Mã nguồn (tại thư mục gốc)

Cấu trúc dự án hiện tại là một monorepo được quản lý bởi NPM workspaces, bao gồm một ứng dụng `client` và một thư mục `microservices` chứa gateway và tất cả các dịch vụ backend. Cấu trúc này sẽ được giữ nguyên.

```
./
├── client/                  # Ứng dụng Frontend React
│   ├── src/
│   └── package.json
└── microservices/           # Các dịch vụ Backend
    ├── gateway/             # API Gateway
    ├── services/            # Các microservice riêng lẻ
    │   ├── admin-service/
    │   ├── auth-service/
    │   ├── gis-service/
    │   ├── ...
    └── shared/              # Các thư viện chia sẻ (database, logger, etc.)
```

**Quyết định về Cấu trúc**: Cấu trúc hiện tại đã rất tốt và tuân theo các thực tiễn tốt nhất cho một monorepo microservices. Chúng ta sẽ giữ nguyên cấu trúc này và thực hiện các thay đổi bên trong các dịch vụ và gateway.

## Theo dõi Độ phức tạp

*Không có vi phạm nào đối với các nguyên tắc cốt lõi, không cần điền vào phần này.*