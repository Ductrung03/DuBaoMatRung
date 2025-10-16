# Hướng dẫn Nhanh (Kiến trúc "Tự Host")

**Tính năng**: Tối ưu hóa CSDL và Phân quyền
**Ngày**: 2025-10-16

Hướng dẫn này cung cấp các bước cần thiết để một lập trình viên thiết lập môi trường cục bộ để làm việc trên kiến trúc "Tự Host" mới.

## 1. Thiết lập Môi trường

Bạn sẽ cần cập nhật các file môi trường (`.env`) cho các microservice liên quan.

#### `auth-service`
```bash
# Trỏ đến CSDL PostgreSQL cục bộ hoặc dev chung cho việc xác thực
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db?schema=public"
```

#### `gis-service` & `admin-service`
```bash
# Trỏ đến các CSDL PostGIS đang chạy trên server của bạn
GIS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gis_db?schema=public"
ADMIN_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/admin_db?schema=public"
```

#### `logging-service` (hoặc service liên quan)
```bash
# Trỏ đến container MongoDB đang chạy cục bộ qua Docker
MONGODB_URI="mongodb://localhost:27017/logging_db"
```

## 2. Thiết lập CSDL & Phụ thuộc

### a) CSDL Logging (Sử dụng Docker có sẵn)

Bạn đã có một container Docker tên `mongodb` đang chạy.

1.  Hãy đảm bảo container đó đang hoạt động:
    ```bash
    docker ps --filter "name=mongodb"
    ```
2.  Kết quả phải cho thấy container đang `Up` và cổng `27017` đang được mở.
3.  Không cần thực hiện thêm bước cài đặt nào cho MongoDB.

### b) CSDL Xác thực (Prisma)

`auth-service` sử dụng Prisma để quản lý schema.

1.  Đi đến thư mục `auth-service`:
    ```bash
    cd microservices/services/auth-service
    ```
2.  Chạy lệnh di chuyển của Prisma để tạo các bảng RBAC mới:
    ```bash
    npx prisma migrate dev --name init-rbac
    ```

### c) Cài đặt Kysely cho các Service GIS

Trong cả hai thư mục `gis-service` và `admin-service`, cài đặt Kysely và driver `pg`:
```bash
# cd microservices/services/gis-service
npm install kysely pg
# cd microservices/services/admin-service
npm install kysely pg
```

## 3. Chạy các Dịch vụ

Khi các biến môi trường và CSDL đã được thiết lập, bạn có thể chạy các dịch vụ như bình thường:

```bash
# Trong /microservices/services/auth-service
npm run dev

# Trong /microservices/services/gis-service
npm run dev

# ... v.v.
```
