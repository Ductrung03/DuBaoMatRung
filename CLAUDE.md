# CLAUDE.md

Tài liệu hướng dẫn cho Claude Code (claude.ai/code) khi làm việc với mã nguồn trong repository này.

## Tổng Quan Dự Án

**DuBaoMatRung** là Hệ thống Giám sát & Dự báo Mất rừng được xây dựng theo kiến trúc microservices. Hệ thống cung cấp các tính năng theo dõi rừng dựa trên GIS, phân tích dữ liệu vệ tinh, dự báo tự động và báo cáo toàn diện.

### Kiến Trúc

- **Frontend**: React 19 + Vite + TailwindCSS + Leaflet (port 5173)
- **Backend**: Kiến trúc microservices với API Gateway (port 3000)
- **Database**: PostgreSQL với Prisma ORM (auth-service) và Kysely (các service khác)
- **Cache**: Redis cho quản lý session và caching
- **GIS**: MapServer cho WMS/WFS tile serving

## Các Lệnh Chính

### Development

```bash
# Khởi động full stack (backend + frontend)
npm run dev

# Chỉ khởi động backend
npm run dev:backend

# Chỉ khởi động frontend
npm run dev:frontend

# Cài đặt tất cả dependencies trong workspaces
cd microservices && npm run install:all
```

### Backend Services

```bash
# Khởi động tất cả microservices ở chế độ development
cd microservices && npm run dev

# Các service chạy trên các port cụ thể:
# - Gateway: 3000
# - Auth Service: 3001
# - User Service: 3002
# - GIS Service: 3003
# - Report Service: 3004
# - Admin Service: 3005
# - Search Service: 3006
# - MapServer Service: 3007
```

### Thao Tác Database (Auth Service)

```bash
cd microservices/services/auth-service

# Generate Prisma client
npm run prisma:generate

# Chạy migrations
npm run prisma:migrate

# Seed database với dữ liệu khởi tạo
npm run prisma:seed
```

### Testing

```bash
# Chạy tất cả tests
npm test

# Integration tests
cd microservices && npm run test:integration
```

### Health Checks

```bash
# Kiểm tra gateway health
npm run health

# Hoặc gọi trực tiếp
curl http://localhost:3000/health
```

## Chi Tiết Kiến Trúc

### Giao Tiếp Microservices

Tất cả các service giao tiếp qua **API Gateway** (port 3000). Gateway xử lý:
- Định tuyến request và proxy tới các backend service
- Xác thực qua JWT middleware
- Rate limiting
- Cấu hình CORS
- Tài liệu Swagger tập trung

**Service URLs** (nội bộ):
- `AUTH_SERVICE_URL`: http://localhost:3001
- `USER_SERVICE_URL`: http://localhost:3002
- `GIS_SERVICE_URL`: http://localhost:3003
- `REPORT_SERVICE_URL`: http://localhost:3004
- `ADMIN_SERVICE_URL`: http://localhost:3005
- `SEARCH_SERVICE_URL`: http://localhost:3006
- `MAPSERVER_SERVICE_URL`: http://localhost:3007

### Thư Viện Dùng Chung

Nằm trong `microservices/shared/`, cung cấp chức năng chung cho tất cả các service:

- **logger**: Logging tập trung dựa trên Winston
- **database**: Quản lý PostgreSQL connection pool
- **errors**: Custom error classes và handlers
- **middleware**: Authentication, error handling, validation
- **redis**: Redis client cho caching
- **swagger**: Tiện ích tài liệu Swagger
- **config**: Quản lý cấu hình chung
- **constants**: Hằng số toàn hệ thống
- **utils**: Các hàm tiện ích chung
- **validators**: Schema validation cho request

### Kiến Trúc Database

**Auth Service** sử dụng **Prisma ORM**:
- Schema: `microservices/services/auth-service/prisma/schema.prisma`
- Models: User, Role, Permission, UserRole, RolePermission, RoleDataScope
- Hệ thống phân quyền phân cấp với kiểm soát truy cập dựa trên tính năng
- Hỗ trợ phạm vi dữ liệu (cấp quốc gia, tỉnh, huyện, xã)

**Các Service khác** sử dụng **Kysely** cho các truy vấn SQL type-safe với truy cập PostgreSQL trực tiếp.

### Xác Thực & Phân Quyền

Hệ thống triển khai RBAC (Role-Based Access Control) tinh vi với:

1. **Phân quyền phân cấp**: Cấu trúc Module → Resource → Action
   - Format: `{module}.{resource}.{action}` (ví dụ: `gis.layer.view`)
   - Phân quyền dựa trên UI cho kiểm soát frontend chi tiết

2. **Phạm vi Dữ liệu**: Kiểm soát truy cập theo địa lý
   - Cấp độ: Quốc gia, Tỉnh, Huyện, Xã
   - Các đơn vị địa lý cụ thể có thể được gán cho role

3. **JWT Tokens**:
   - Access token hết hạn sau 7 ngày
   - Refresh token hết hạn sau 30 ngày
   - Token bao gồm permissions của user cho validation phía client

### Cấu Trúc Frontend

**Client** (`client/src/`):
- **components**: Các component UI tái sử dụng
- **pages**: Các component cấp route
- **services**: Các module API client (axios)
- **store**: Quản lý state
- **hooks**: Custom React hooks
- **utils**: Tiện ích frontend
- **constants**: Hằng số frontend
- **config.js**: API endpoints và cấu hình app

**Cấu hình Proxy**: Tất cả request `/api/*` được proxy tới gateway (port 3000) qua Vite dev server.

### GIS & MapServer

- **Cấu hình MapServer**: `mapserver/mapserver.conf`
- **Mapfiles**: `mapserver/mapfiles/*.map`
- **Service**: Microservice chuyên dụng wrap MapServer cho các request WMS/WFS
- **Tích hợp**: GIS service xử lý upload shapefile, xử lý qua ogr2ogr, và quản lý layer

### Logging

Mỗi service duy trì các log có cấu trúc trong thư mục `logs/` riêng:
- `{service}-combined.log`: Tất cả logs
- `{service}-error.log`: Chỉ error logs
- `{service}-exceptions.log`: Unhandled exceptions
- `{controller}-combined.log`: Logs theo từng controller

Logs sử dụng Winston với định dạng JSON và bao gồm timestamps, tên service, và metadata ngữ cảnh.

## Quy Trình Phát Triển

### Thêm Service Mới

1. Tạo thư mục service trong `microservices/services/`
2. Thêm `package.json` với các script chuẩn
3. Sử dụng shared libraries cho logger, database, errors
4. Đăng ký service trong `microservices/package.json` workspaces
5. Thêm service URL vào `.env` của gateway
6. Cấu hình proxy route trong `microservices/gateway/src/index.js`
7. Thêm health check endpoint: `GET /health`

### Hệ Thống Phân Quyền

Khi thêm tính năng mới cần phân quyền:

1. Định nghĩa permission theo format: `{module}.{resource}.{action}`
2. Thêm vào cấu hình permission: `microservices/services/auth-service/src/config/modern-permissions.config.js`
3. Permissions tự động seed qua `npm run prisma:seed`
4. Bảo vệ routes với authentication middleware
5. Kiểm tra permissions sử dụng endpoints của `auth-service`

### Database Migrations

**Cho auth-service (Prisma)**:
```bash
cd microservices/services/auth-service
npx prisma migrate dev --name mo_ta_thay_doi
npx prisma generate
```

**Cho các service khác**: Migrations SQL thủ công trong `microservices/database/migrations/`

## Biến Môi Trường

Các service chia sẻ biến môi trường chung được định nghĩa trong `microservices/.env`:

**Bắt buộc**:
- `NODE_ENV`: development | production
- `JWT_SECRET`: Secret cho JWT signing
- `REDIS_HOST`, `REDIS_PORT`: Kết nối Redis
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Kết nối PostgreSQL

**Riêng từng service**: Xem file `.env.template` của từng service

## Ghi Chú Testing

- Integration tests: `microservices/tests/`
- Load tests: `microservices/load-tests/`
- Test của từng service sử dụng Jest
- Hiện tại chưa có test coverage toàn diện

## Triển Khai Production

```bash
# Build frontend
npm run build:frontend

# Build backend (Docker)
npm run build:backend

# Deploy lên staging
npm run deploy:staging

# Deploy lên production
npm run deploy:prod
```

## Spec-Driven Development

Dự án sử dụng **SpecKit** cho đặc tả và triển khai tính năng:

Các lệnh có sẵn:
- `/speckit.specify`: Tạo đặc tả tính năng
- `/speckit.clarify`: Xác định các phần chưa rõ
- `/speckit.plan`: Tạo kế hoạch triển khai
- `/speckit.tasks`: Tạo danh sách task có thể thực hiện
- `/speckit.implement`: Thực thi triển khai
- `/speckit.analyze`: Phân tích chéo các artifact
- `/speckit.checklist`: Tạo checklist cho tính năng
- `/speckit.constitution`: Quản lý nguyên tắc dự án

## Chuẩn Code & Style

Theo yêu cầu của LuckyBoiz:
- **Clean code**: Cấu trúc tốt, dễ đọc, dễ maintain
- **Tối ưu**: Triển khai có ý thức về performance
- **Production-ready**: Patterns và kiến trúc đã được kiểm chứng thực chiến
- **Dễ mở rộng**: Dễ extend và dễ hiểu

### Pattern Cấu Trúc Service

```
service-name/
├── src/
│   ├── controllers/    # Xử lý request
│   ├── routes/         # Định nghĩa route
│   ├── services/       # Business logic
│   ├── middleware/     # Middleware riêng của service
│   ├── utils/          # Tiện ích service
│   └── index.js        # Entry point
├── logs/               # Log của service
├── package.json
└── .env
```

## Quy Tắc Code Bắt Buộc

### 1. Kiến Trúc & Tổ Chức Code

#### Backend Services

**Separation of Concerns (Tách biệt trách nhiệm)**:
```javascript
// ❌ KHÔNG LÀM - Trộn lẫn logic
app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});

// ✅ LÀM - Tách riêng từng layer
// routes/user.routes.js
router.get('/', authMiddleware, userController.getAll);

// controllers/user.controller.js
async getAll(req, res, next) {
  try {
    const users = await userService.getAll(req.user);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

// services/user.service.js
async getAll(currentUser) {
  // Business logic ở đây
  return await userRepository.findAll();
}
```

**Dependency Injection**:
```javascript
// ✅ Inject dependencies, không hardcode
class UserService {
  constructor(logger, database, cache) {
    this.logger = logger;
    this.db = database;
    this.cache = cache;
  }
}

// Sử dụng shared libraries
const logger = require('../../../shared/logger');
const { DatabaseManager } = require('../../../shared/database');
```

#### Frontend Components

**Component Structure**:
```javascript
// ✅ Cấu trúc component chuẩn
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// 1. Imports
// 2. Component definition
// 3. PropTypes
// 4. Export

const UserList = ({ filters, onSelect }) => {
  // Hooks ở đầu
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // Event handlers
  const handleSelect = (user) => {
    onSelect(user);
  };

  // Helper functions
  const fetchUsers = async () => {
    // Logic
  };

  // Render
  return (/* JSX */);
};

UserList.propTypes = {
  filters: PropTypes.object,
  onSelect: PropTypes.func.isRequired
};

export default UserList;
```

### 2. Naming Conventions

**Files & Folders**:
```
✅ kebab-case cho files/folders:
- user-controller.js
- auth-middleware.js
- gis-service/

✅ PascalCase cho React components:
- UserList.jsx
- MapView.jsx
- PermissionTree.jsx

✅ camelCase cho utilities:
- formatDate.js
- validateInput.js
```

**Variables & Functions**:
```javascript
// ✅ camelCase cho biến và hàm
const userName = 'John';
function getUserById(id) {}

// ✅ PascalCase cho classes
class UserService {}

// ✅ UPPER_CASE cho constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'http://localhost:3000';

// ✅ Tên có ý nghĩa, mô tả rõ ràng
const isUserAuthenticated = true;  // ✅
const flag = true;                  // ❌

async function fetchUserPermissions() {}  // ✅
async function getData() {}               // ❌
```

### 3. Error Handling

**Backend - Luôn sử dụng try-catch và error middleware**:
```javascript
// ✅ Controller với error handling chuẩn
async createUser(req, res, next) {
  try {
    const user = await userService.create(req.body);

    logger.info('User created successfully', { userId: user.id });

    res.status(201).json({
      success: true,
      data: user,
      message: 'Tạo người dùng thành công'
    });
  } catch (error) {
    logger.error('Failed to create user', {
      error: error.message,
      body: req.body
    });
    next(error); // Chuyển cho error middleware
  }
}

// ✅ Custom error classes (sử dụng từ shared/errors)
throw new ValidationError('Email không hợp lệ');
throw new NotFoundError('Người dùng không tồn tại');
throw new UnauthorizedError('Không có quyền truy cập');
```

**Frontend - Toast notifications và loading states**:
```javascript
// ✅ Xử lý error với user feedback
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async () => {
  setLoading(true);
  setError(null);

  try {
    const result = await api.createUser(data);
    toast.success('Tạo người dùng thành công');
    navigate('/users');
  } catch (err) {
    const message = err.response?.data?.message || 'Có lỗi xảy ra';
    setError(message);
    toast.error(message);
  } finally {
    setLoading(false);
  }
};
```

### 4. API Response Format

**Chuẩn hóa response**:
```javascript
// ✅ Success response
{
  "success": true,
  "data": { /* payload */ },
  "message": "Thao tác thành công",
  "pagination": { // Nếu có
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// ✅ Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "email", "message": "Email không đúng định dạng" }
    ]
  }
}
```

### 5. Database Queries

**Prisma (Auth Service)**:
```javascript
// ✅ Sử dụng transactions cho operations phức tạp
const user = await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({ data: userData });
  await tx.userRole.create({
    data: { userId: newUser.id, roleId: roleId }
  });
  return newUser;
});

// ✅ Select chỉ field cần thiết
const users = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    email: true,
    // Không select password_hash
  }
});

// ✅ Sử dụng include cho relations
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    userRoles: {
      include: {
        role: true
      }
    }
  }
});
```

**Kysely (Other Services)**:
```javascript
// ✅ Type-safe queries
const users = await db
  .selectFrom('users')
  .select(['id', 'username', 'email'])
  .where('is_active', '=', true)
  .execute();

// ✅ Sử dụng prepared statements (tự động với Kysely)
const user = await db
  .selectFrom('users')
  .selectAll()
  .where('id', '=', userId) // Safe from SQL injection
  .executeTakeFirst();
```

### 6. Logging

**Luôn log đầy đủ context**:
```javascript
// ✅ Log với structured data
logger.info('User login successful', {
  userId: user.id,
  username: user.username,
  ip: req.ip,
  timestamp: new Date()
});

logger.error('Database connection failed', {
  error: err.message,
  code: err.code,
  service: 'auth-service',
  retryCount: 3
});

// ❌ KHÔNG log như này
logger.info('Login ok');
logger.error(err); // Thiếu context
```

**Log levels**:
- `error`: Lỗi cần xử lý ngay
- `warn`: Cảnh báo, có thể cần quan tâm
- `info`: Thông tin quan trọng (login, CRUD operations)
- `debug`: Chi tiết để debug (chỉ trong development)

### 7. Security

**KHÔNG BAO GIỜ**:
```javascript
// ❌ TUYỆT ĐỐI KHÔNG commit secrets
const JWT_SECRET = 'mysecret123'; // ❌

// ✅ Luôn dùng environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// ❌ KHÔNG expose sensitive data
res.json({ user: userWithPassword }); // ❌

// ✅ Loại bỏ sensitive fields
const { password_hash, ...safeUser } = user;
res.json({ user: safeUser });

// ❌ KHÔNG trust user input
const query = `SELECT * FROM users WHERE id = ${req.params.id}`; // SQL Injection!

// ✅ Sử dụng parameterized queries
const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

**Input Validation**:
```javascript
// ✅ Validate ở middleware layer
const { body, validationResult } = require('express-validator');

router.post('/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('username').trim().isLength({ min: 3 })
  ],
  validationMiddleware, // Check validationResult
  userController.create
);
```

### 8. Performance

**Caching**:
```javascript
// ✅ Cache data ít thay đổi
const cacheKey = `permissions:${userId}`;
let permissions = await cache.get(cacheKey);

if (!permissions) {
  permissions = await fetchUserPermissions(userId);
  await cache.set(cacheKey, permissions, 3600); // 1 hour
}
```

**Database Indexing**:
```javascript
// ✅ Index các field thường query
// Prisma schema
model User {
  id       Int    @id @default(autoincrement())
  username String @unique
  email    String

  @@index([email])      // ✅ Index cho search
  @@index([username])   // ✅ Index cho unique lookups
}
```

**Pagination**:
```javascript
// ✅ Luôn paginate khi query nhiều records
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const [users, total] = await Promise.all([
  prisma.user.findMany({ skip, take: limit }),
  prisma.user.count()
]);

res.json({
  success: true,
  data: users,
  pagination: { page, limit, total, pages: Math.ceil(total / limit) }
});
```

### 9. Code Comments

**Khi nào cần comment**:
```javascript
// ✅ Comment cho logic phức tạp
// Tính toán diện tích mất rừng dựa trên thuật toán Haversine
// Tham khảo: https://en.wikipedia.org/wiki/Haversine_formula
function calculateForestLoss(coordinates) {
  // Implementation
}

// ✅ Comment cho workarounds
// TODO: Tạm thời dùng polling vì WebSocket chưa stable
// Issue: #123
setInterval(() => checkStatus(), 5000);

// ❌ KHÔNG comment những gì code đã nói rõ
const user = getUser(); // Get user ❌
```

### 10. Git Commits

**Commit Messages**:
```bash
# ✅ Format chuẩn
<type>: <subject>

<body>

# Types:
# feat: Tính năng mới
# fix: Sửa bug
# refactor: Refactor code
# docs: Cập nhật docs
# style: Format, semicolons, etc
# test: Thêm tests
# chore: Maintenance tasks

# Ví dụ:
feat: thêm API tìm kiếm mất rừng theo khu vực

- Thêm endpoint GET /api/search/mat-rung
- Hỗ trợ filter theo tỉnh, huyện, xã
- Thêm pagination và sorting

Closes #234
```

### 11. Testing

**Unit Tests**:
```javascript
// ✅ Test business logic
describe('UserService', () => {
  describe('create', () => {
    it('should hash password before saving', async () => {
      const userData = { username: 'test', password: 'plain' };
      const user = await userService.create(userData);

      expect(user.password_hash).not.toBe('plain');
      expect(user.password_hash).toMatch(/^\$2[aby]\$/);
    });

    it('should throw error for duplicate username', async () => {
      await expect(
        userService.create({ username: 'existing' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

### 12. Code Review Checklist

Trước khi commit, tự kiểm tra:

- [ ] Code tuân thủ naming conventions
- [ ] Có error handling đầy đủ
- [ ] Có logging ở các điểm quan trọng
- [ ] Đã loại bỏ console.log/debugger
- [ ] Không có secrets/credentials hardcode
- [ ] Đã validate input
- [ ] Đã xử lý edge cases
- [ ] Response format thống nhất
- [ ] Có comment cho logic phức tạp
- [ ] Database queries được optimize (select, index)
- [ ] Frontend: có loading/error states
- [ ] Đã test thủ công các case chính

## Các Vấn Đề Thường Gặp

1. **Xung đột port**: Đảm bảo tất cả các port của service (3000-3007, 5173) đều available
2. **Kết nối database**: Xác minh PostgreSQL đang chạy và credentials đúng
3. **Kết nối Redis**: Đảm bảo Redis đang chạy trên port đã cấu hình
4. **Prisma client**: Chạy `npx prisma generate` sau khi thay đổi schema
5. **MapServer**: Yêu cầu cài đặt GDAL/MapServer đúng cách cho chức năng GIS

## Tài Nguyên Bổ Sung

- **Windows Deployment**: Xem `scripts/windows/README.md`
- **Database Schema**: Xem `microservices/database/DEPRECATED.md` cho ngữ cảnh lịch sử
- **Hệ thống Phân quyền**: Xem `microservices/services/auth-service/src/config/` cho cấu hình permissions
