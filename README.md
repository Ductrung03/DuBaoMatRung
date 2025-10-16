# Hệ thống Dự báo Mất Rừng

Hệ thống web GIS cho việc phát hiện, giám sát và quản lý các sự kiện mất rừng tại tỉnh Lào Cai.

## Kiến trúc Hệ thống

Dự án sử dụng kiến trúc microservices với "Self-Host" infrastructure để tối ưu hóa hiệu năng và chi phí.

### Tech Stack

- **Frontend**: React, Leaflet, OpenLayers
- **Backend**: Node.js, Express.js
- **Databases**:
  - PostgreSQL + PostGIS (GIS data, Auth)
  - MongoDB (Logging)
- **ORMs/Query Builders**:
  - Prisma (auth-service)
  - Kysely (gis-service, admin-service)
  - Native MongoDB driver (logging)
- **Infrastructure**: Docker, Nginx

### Kiến trúc Microservices

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Gateway   │
│  (Express)  │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       v                                 v
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ auth-service│  │ gis-service  │  │admin-service │
│  (Prisma)   │  │  (Kysely)    │  │  (Kysely)    │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │                │                  │
       v                v                  v
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  auth_db    │  │   gis_db     │  │  admin_db    │
│ (PostgreSQL)│  │ (PostGIS)    │  │ (PostGIS)    │
└─────────────┘  └──────────────┘  └──────────────┘

┌─────────────┐
│  logging    │
│ (MongoDB)   │
└─────────────┘
```

## Yêu cầu Hệ thống

### Phần mềm cần thiết

- Node.js >= 18.x
- PostgreSQL >= 14 với PostGIS extension
- Docker và Docker Compose
- Git

### Cổng mặc định

- Frontend: `3001`
- Gateway: `3000`
- Auth Service: `3002`
- GIS Service: `3003`
- Admin Service: `3005`
- MongoDB: `27017`
- PostgreSQL: `5432`

## Cài đặt và Khởi động

### 1. Clone repository

```bash
git clone <repository-url>
cd DuBaoMatRung
```

### 2. Cài đặt dependencies

```bash
# Cài đặt dependencies cho gateway
cd microservices/gateway
npm install

# Cài đặt dependencies cho từng service
cd ../services/auth-service
npm install

cd ../gis-service
npm install

cd ../admin-service
npm install

# Cài đặt dependencies cho client
cd ../../../client
npm install
```

### 3. Khởi động MongoDB (Docker)

```bash
docker ps --filter "name=mongodb"
```

Nếu container chưa chạy:

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

### 4. Thiết lập Databases

#### PostgreSQL Databases

Tạo các database cần thiết:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE gis_db;
CREATE DATABASE admin_db;

-- Enable PostGIS for GIS databases
\c gis_db
CREATE EXTENSION IF NOT EXISTS postgis;

\c admin_db
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### Prisma Migrations (auth-service)

```bash
cd microservices/services/auth-service
npx prisma migrate dev --name init-rbac
npx prisma generate
```

### 5. Cấu hình Environment Variables

Tạo file `.env` trong mỗi service dựa trên `.env.example`:

#### auth-service/.env
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db?schema=public"
JWT_SECRET="your-secret-key"
PORT=3002
```

#### gis-service/.env
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gis_db?schema=public"
PORT=3003
```

#### admin-service/.env
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/admin_db?schema=public"
PORT=3005
```

#### gateway/.env
```bash
PORT=3000
AUTH_SERVICE_URL="http://localhost:3002"
GIS_SERVICE_URL="http://localhost:3003"
ADMIN_SERVICE_URL="http://localhost:3005"
MONGODB_URI="mongodb://localhost:27017/logging_db"
```

### 6. Chạy Services

#### Development Mode

Mở các terminal riêng cho mỗi service:

```bash
# Terminal 1 - Gateway
cd microservices/gateway
npm run dev

# Terminal 2 - Auth Service
cd microservices/services/auth-service
npm run dev

# Terminal 3 - GIS Service
cd microservices/services/gis-service
npm run dev

# Terminal 4 - Admin Service
cd microservices/services/admin-service
npm run dev

# Terminal 5 - Client
cd client
npm run dev
```

### 7. Truy cập Ứng dụng

- Frontend: http://localhost:3001
- API Gateway: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs

## Tính năng Chính

### 1. Xác thực & Phân quyền (RBAC)

- Đăng nhập/đăng xuất
- Quản lý người dùng
- Phân quyền dựa trên vai trò (Role-Based Access Control)
- JWT authentication

**Technology**: Prisma ORM + PostgreSQL

### 2. Quản lý Dữ liệu GIS

- Hiển thị bản đồ mất rừng
- Tìm kiếm và lọc theo khu vực
- Xác minh sự kiện mất rừng
- Import/Export dữ liệu Shapefile

**Technology**: Kysely Query Builder + PostGIS

### 3. Quản lý Ranh giới Hành chính

- Dropdown động cho Huyện, Xã, Tiểu khu, Khoảnh
- Tra cứu ranh giới hành chính
- Hiển thị lớp bản đồ hành chính

**Technology**: Kysely Query Builder + PostGIS

### 4. Ghi log Hoạt động

- Ghi nhận tất cả hoạt động người dùng
- Lưu trữ trong MongoDB để linh hoạt schema
- Truy vấn và báo cáo log

**Technology**: MongoDB + Native Driver

## Kiến trúc Database

### auth_db (PostgreSQL)

```
User (id, username, password_hash, full_name, is_active, created_at, last_login)
  ├─> UserRoles (many-to-many)

Role (id, name, description)
  ├─> RolePermissions (many-to-many)

Permission (id, action, subject, description)
```

### gis_db (PostGIS)

```
mat_rung (gid, geom, detection_status, detection_date, verified_by, ...)
```

### admin_db (PostGIS)

```
laocai_rg3lr (gid, geom, huyen, xa, tk, khoanh, churung, ...)
laocai_huyen (gid, geom, huyen, tinh, ...)
laocai_ranhgioihc (gid, geom, ...)
```

### logging_db (MongoDB)

```javascript
activity_logs: {
  _id: ObjectId,
  timestamp: ISODate,
  userId: Number,
  service: String,
  action: String,
  ipAddress: String,
  details: Object
}
```

## Testing

### Unit Tests

```bash
cd microservices/services/auth-service
npm test
```

### Integration Tests

```bash
cd microservices/tests
npm install
npm run test:integration
```

### End-to-End Tests

```bash
cd microservices/tests
npm run test:e2e
```

## API Documentation

API documentation is available at `/api-docs` when the gateway is running.

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Thông tin người dùng hiện tại
- `GET /api/auth/roles` - Danh sách vai trò
- `GET /api/auth/permissions` - Danh sách quyền

#### GIS Data
- `GET /api/mat-rung/all` - Lấy tất cả dữ liệu mất rừng
- `GET /api/mat-rung/:gid` - Lấy chi tiết một sự kiện
- `GET /api/mat-rung/stats` - Thống kê mất rừng
- `POST /api/verification/verify` - Xác minh sự kiện mất rừng

#### Administrative Data
- `GET /api/dropdown/huyen` - Danh sách huyện
- `GET /api/dropdown/xa` - Danh sách xã
- `GET /api/dropdown/tieukhu` - Danh sách tiểu khu

#### Logging
- `POST /api/logs` - Tạo log mới
- `GET /api/logs` - Truy vấn logs

## Migration Notes

### From FDW to API-based Architecture

Dự án đã được migrate từ Foreign Data Wrapper (FDW) sang kiến trúc API-based:

**Before (FDW)**:
- Các database kết nối trực tiếp qua FDW
- Materialized views cho cross-database queries
- Phức tạp và khó maintain

**After (API-based)**:
- Mỗi service quản lý database riêng
- Giao tiếp qua REST APIs
- Dễ scale và maintain

**Cleanup**: Xem [DEPRECATED.md](./microservices/database/DEPRECATED.md) để biết chi tiết về các component đã loại bỏ.

## Troubleshooting

### MongoDB Connection Failed

```bash
# Kiểm tra container đang chạy
docker ps --filter "name=mongodb"

# Khởi động lại container
docker restart mongodb
```

### PostgreSQL Connection Issues

```bash
# Kiểm tra PostgreSQL service
sudo systemctl status postgresql

# Kiểm tra port
ss -tuln | grep 5432
```

### Prisma Migration Failed

```bash
cd microservices/services/auth-service

# Reset database
npx prisma migrate reset

# Tạo lại migrations
npx prisma migrate dev
```

### Port Already in Use

```bash
# Tìm process đang sử dụng port
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Contributing

1. Tạo branch mới từ `main`
2. Commit changes với message rõ ràng
3. Push và tạo Pull Request
4. Đợi review và merge

## License

[Thêm license information]

## Contact

[Thêm contact information]

## Changelog

### Version 2.0.0 (2025-10-16)
- ✅ Migrated to "Self-Host" architecture
- ✅ Implemented RBAC with Prisma
- ✅ Replaced FDW with Kysely Query Builder
- ✅ Separated logging to MongoDB
- ✅ Added comprehensive E2E tests
- ✅ Updated documentation

### Version 1.0.0
- Initial release with FDW-based architecture
