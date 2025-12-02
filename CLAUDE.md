# CLAUDE.md

Hướng dẫn Claude Code làm việc với dự án DuBaoMatRung.

## Về Dự Án

**DuBaoMatRung** - Hệ thống Giám sát & Dự báo Mất rừng theo kiến trúc microservices.

### Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS + Leaflet (port 5173)
- **Backend**: Microservices + API Gateway (port 3000)
- **Database**: PostgreSQL với Prisma (auth-service) và Kysely (các service khác)
- **Cache**: Redis
- **GIS**: MapServer

### Services & Ports

- Gateway: 3000
- Auth Service: 3001 (Prisma ORM)
- User Service: 3002
- GIS Service: 3003
- Report Service: 3004
- Admin Service: 3005
- Search Service: 3006
- MapServer Service: 3007

## Quick Start

```bash
# Full stack
npm run dev

# Chỉ backend
npm run dev:backend

# Chỉ frontend
npm run dev:frontend

# Cài dependencies
cd microservices && npm run install:all
```

### Database Setup

```bash
cd microservices/services/auth-service
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Cấu Trúc Dự Án

```
microservices/
├── gateway/              # API Gateway, routing, auth
├── services/
│   ├── auth-service/    # Authentication, RBAC (Prisma)
│   ├── user-service/    # User management (Kysely)
│   ├── gis-service/     # GIS, shapefile processing
│   ├── report-service/  # Báo cáo
│   ├── admin-service/   # Admin functions
│   └── search-service/  # Search functionality
└── shared/              # Shared libraries
    ├── logger/          # Winston logging
    ├── database/        # PostgreSQL connection
    ├── errors/          # Custom error classes
    ├── middleware/      # Auth, validation, error handling
    ├── redis/           # Redis client
    └── utils/           # Common utilities

client/
├── src/
│   ├── components/      # UI components
│   ├── pages/           # Route pages
│   ├── services/        # API clients
│   ├── store/           # State management
│   └── config.js        # API endpoints

mapserver/
├── mapfiles/            # MapServer mapfiles
└── mapserver.conf       # MapServer config
```

## Kiến Trúc

### API Gateway Pattern

Tất cả requests đi qua Gateway (port 3000):
- Routing & proxy tới services
- JWT authentication
- Rate limiting
- CORS configuration
- Swagger tập trung

### RBAC System

Format permission: `{module}.{resource}.{action}`
- Ví dụ: `gis.layer.view`, `user.user.create`
- Config: `microservices/services/auth-service/src/config/modern-permissions.config.js`
- Data scope: Quốc gia → Tỉnh → Huyện → Xã

### Database Strategy

**Auth Service (Prisma)**:
- Schema: `prisma/schema.prisma`
- Models: User, Role, Permission, UserRole, RolePermission, RoleDataScope
- Migration: `npx prisma migrate dev --name <name>`

**Other Services (Kysely)**:
- Type-safe SQL queries
- Direct PostgreSQL access
- Manual migrations: `microservices/database/migrations/`

## Quy Tắc Code

### 1. Cấu Trúc Service

```
service-name/
├── src/
│   ├── controllers/    # Request handling
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── middleware/     # Service middleware
│   └── index.js        # Entry point
├── logs/               # Service logs
└── package.json
```

### 2. Separation of Concerns

```javascript
// Routes → Controllers → Services → Repository

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
  return await userRepository.findAll();
}
```

### 3. Naming Conventions

- Files/Folders: `kebab-case` (user-controller.js, gis-service/)
- React Components: `PascalCase` (UserList.jsx, MapView.jsx)
- Variables/Functions: `camelCase` (getUserById, userName)
- Classes: `PascalCase` (UserService)
- Constants: `UPPER_CASE` (MAX_RETRY_COUNT, API_BASE_URL)

### 4. API Response Format

```javascript
// Success
{
  "success": true,
  "data": { /* payload */ },
  "message": "Thao tác thành công",
  "pagination": { "page": 1, "limit": 20, "total": 100 } // optional
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [...]
  }
}
```

### 5. Error Handling

```javascript
// Backend
async createUser(req, res, next) {
  try {
    const user = await userService.create(req.body);
    logger.info('User created', { userId: user.id });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error('Create user failed', { error: error.message });
    next(error);
  }
}

// Frontend
const [loading, setLoading] = useState(false);
try {
  setLoading(true);
  const result = await api.createUser(data);
  toast.success('Thành công');
} catch (err) {
  toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
} finally {
  setLoading(false);
}
```

### 6. Security Checklist

- ✅ Dùng environment variables cho secrets
- ✅ Validate & sanitize input
- ✅ Parameterized queries (tránh SQL injection)
- ✅ Loại bỏ sensitive data khỏi response
- ✅ JWT authentication cho protected routes
- ❌ KHÔNG commit secrets vào git
- ❌ KHÔNG trust user input

### 7. Performance

```javascript
// Caching
const cacheKey = `permissions:${userId}`;
let data = await cache.get(cacheKey);
if (!data) {
  data = await fetchData();
  await cache.set(cacheKey, data, 3600);
}

// Pagination
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

// Database: Select chỉ field cần thiết
const users = await prisma.user.findMany({
  select: { id: true, username: true, email: true }
});
```

### 8. Logging

```javascript
// Structured logging với context
logger.info('User login', {
  userId: user.id,
  username: user.username,
  ip: req.ip
});

logger.error('DB connection failed', {
  error: err.message,
  service: 'auth-service'
});

// Levels: error, warn, info, debug
```

## Quy Trình Dev

### Thêm Service Mới

1. Tạo folder trong `microservices/services/`
2. Dùng shared libraries: logger, database, errors
3. Đăng ký trong `microservices/package.json` workspaces
4. Thêm URL vào `.env` của gateway
5. Config proxy route trong gateway
6. Thêm health check: `GET /health`

### Thêm Permission Mới

1. Define: `{module}.{resource}.{action}`
2. Thêm vào `modern-permissions.config.js`
3. Seed: `npm run prisma:seed`
4. Protect routes với auth middleware

### Database Migrations

```bash
# Prisma (auth-service)
cd microservices/services/auth-service
npx prisma migrate dev --name <description>
npx prisma generate

# Kysely (other services)
# Manual SQL migrations in microservices/database/migrations/
```

## Environment Variables

File: `microservices/.env`

```bash
NODE_ENV=development
JWT_SECRET=your_secret
REDIS_HOST=localhost
REDIS_PORT=6379
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=dubao_matrung
```

## SpecKit Commands

```bash
/speckit.specify     # Tạo spec
/speckit.plan        # Tạo plan
/speckit.tasks       # Tạo tasks
/speckit.implement   # Implement
/speckit.analyze     # Phân tích
```

## Git Commit Format

```bash
<type>: <subject>

# Types: feat, fix, refactor, docs, style, test, chore

# Ví dụ:
feat: thêm API tìm kiếm mất rừng

- Thêm endpoint GET /api/search/mat-rung
- Hỗ trợ filter theo tỉnh, huyện, xã
- Thêm pagination

Closes #234
```

## Code Review Checklist

- [ ] Naming conventions đúng
- [ ] Error handling đầy đủ
- [ ] Logging ở các điểm quan trọng
- [ ] Không có console.log/debugger
- [ ] Không có secrets hardcode
- [ ] Input validation
- [ ] Response format chuẩn
- [ ] Database queries optimize
- [ ] Frontend: loading/error states

## Troubleshooting

1. **Port conflict**: Check ports 3000-3007, 5173
2. **DB connection**: Verify PostgreSQL running & credentials
3. **Redis**: Ensure Redis running on configured port
4. **Prisma**: Run `npx prisma generate` after schema changes
5. **MapServer**: Requires GDAL/MapServer installation

## Tài Liệu Tham Khảo

- Windows Deployment: `scripts/windows/README.md`
- Permission Config: `microservices/services/auth-service/src/config/`
- Database Schema: `microservices/services/auth-service/prisma/schema.prisma`
