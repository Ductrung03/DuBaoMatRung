# Nghiên cứu & Quyết định (Kiến trúc "Tự Host")

**Tính năng**: Tối ưu hóa CSDL và Phân quyền
**Ngày**: 2025-10-16

## 1. Tích hợp MongoDB cho Dịch vụ Logging

- **Nhiệm vụ**: "Lựa chọn phương pháp triển khai MongoDB trên server hiện có."
- **Quyết định**: Chúng ta sẽ chạy **MongoDB trong một Docker container** trên server hiện tại.
- **Lý do**:
  - **Không tốn chi phí**: Tận dụng server hiện có của bạn.
  - **Dễ quản lý**: Docker giúp đóng gói và quản lý MongoDB một cách sạch sẽ, tách biệt với các thành phần khác của hệ thống.
  - **Triển khai nhanh**: Có sẵn các image chính thức của MongoDB trên Docker Hub.
- **Driver kết nối**: Vẫn sử dụng driver Node.js chính thức `mongodb` để kết nối từ service tới container MongoDB.

## 2. Chiến lược Truy cập Dữ liệu GIS

- **Nhiệm vụ**: "Tìm một công cụ thay thế cho việc viết SQL thuần để làm việc với PostGIS mà không cần ORM đầy đủ."
- **Quyết định**: Chúng ta sẽ sử dụng **Kysely**, một TypeScript SQL query builder.
- **Lý do**:
  - **Type-Safe**: Kysely cung cấp tính năng kiểm tra kiểu dữ liệu mạnh mẽ, giúp bắt lỗi ngay tại thời điểm viết code, an toàn hơn nhiều so với việc viết chuỗi SQL bằng tay.
  - **Linh hoạt**: Nó không phải là một ORM, vì vậy nó không cố gắng che giấu SQL. Điều này cho phép chúng ta dễ dàng sử dụng các hàm và kiểu dữ liệu đặc thù của PostGIS (`ST_DWithin`, `ST_Area`, etc.) một cách tự nhiên.
  - **"Clean" Code**: Giúp code truy vấn CSDL trở nên dễ đọc và dễ bảo trì hơn rất nhiều so với các chuỗi SQL dài và phức tạp nằm rải rác trong mã nguồn.
- **Phương án khác đã cân nhắc**:
  - **SQL thuần**: Rủi ro cao về lỗi chính tả, lỗi logic và tấn công SQL Injection. Rất khó bảo trì.
  - **Prisma (với raw query)**: Phức tạp hơn Kysely khi làm việc với các truy vấn động và các hàm không được Prisma hỗ trợ trực tiếp. Kysely được thiết kế cho bài toán này.

## 3. Schema Prisma cho RBAC

- **Nhiệm vụ**: "Định nghĩa schema Prisma tối ưu cho mô hình Role-Based Access Control (RBAC) mới là gì?"
- **Quyết định**: **Không thay đổi.** Quyết định này vẫn giữ nguyên. Chúng ta sẽ triển khai mối quan hệ nhiều-nhiều giữa Users và Roles, và giữa Roles và Permissions trong `auth-service` bằng Prisma.
- **Lý do**: Đây là mô hình RBAC tiêu chuẩn, linh hoạt và `auth_db` không chứa dữ liệu GIS nên Prisma là lựa chọn hoàn hảo.
