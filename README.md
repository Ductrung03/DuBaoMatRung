# DuBaoMatRung

Hệ thống Giám sát & Dự báo Mất rừng theo kiến trúc microservices.

## 🚀 Quick Start

### Development

```bash
# Cài dependencies
cd microservices && npm run install:all

# Setup database
cd services/auth-service
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Chạy full stack
npm run dev

# Hoặc chạy riêng
npm run dev:backend  # Chỉ backend
npm run dev:frontend # Chỉ frontend
```

### Production Deployment (Windows Server)

```powershell
# 1. Trên máy hiện tại - Chuẩn bị package
.\prepare-deploy.ps1

# 2. Transfer thư mục deploy-package lên server

# 3. Trên server - Setup tự động
.\setup-server.ps1
```

📚 **Chi tiết**: Xem [QUICK_START_DEPLOY.md](QUICK_START_DEPLOY.md)

## 📋 Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS + Leaflet
- **Backend**: Node.js Microservices + API Gateway
- **Database**: PostgreSQL với Prisma (auth) và Kysely (others)
- **Cache**: Redis
- **GIS**: MapServer
- **Process Manager**: PM2 (production)

## 🏗️ Kiến Trúc

```
┌─────────────┐
│   Client    │ (React, port 5173)
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────────┐
│            API Gateway (port 3000)              │
│  - Routing & Proxy                              │
│  - JWT Authentication                           │
│  - Rate Limiting                                │
│  - CORS                                         │
└──────┬──────────────────────────────────────────┘
       │
       ├─► Auth Service (3001)      - Authentication, RBAC
       ├─► User Service (3002)      - User management
       ├─► GIS Service (3003)       - GIS, shapefile processing
       ├─► Report Service (3004)    - Reporting
       ├─► Admin Service (3005)     - Administration
       ├─► Search Service (3006)    - Search functionality
       └─► MapServer Service (3007) - MapServer integration
```

## 📂 Cấu Trúc Dự Án

```
microservices/
├── gateway/              # API Gateway
├── services/
│   ├── auth-service/    # Authentication (Prisma ORM)
│   ├── user-service/    # User management
│   ├── gis-service/     # GIS processing
│   ├── report-service/  # Reporting
│   ├── admin-service/   # Admin functions
│   └── search-service/  # Search
└── shared/              # Shared libraries
    ├── logger/          # Winston logging
    ├── database/        # PostgreSQL connection
    ├── errors/          # Custom error classes
    ├── middleware/      # Auth, validation, error handling
    ├── redis/           # Redis client
    └── utils/           # Common utilities

client/                  # React frontend
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── store/

docker/
└── initial-data/        # Database SQL dumps (auth_db.sql, gis_db.sql, admin_db.sql)
```

## 🔑 RBAC System

Format permission: `{module}.{resource}.{action}`

Ví dụ:
- `gis.layer.view` - Xem layer GIS
- `user.user.create` - Tạo user
- `report.report.export` - Export báo cáo

**Data Scope Hierarchy**: Quốc gia → Tỉnh → Huyện → Xã

Config: [modern-permissions.config.js](microservices/services/auth-service/src/config/modern-permissions.config.js)

## 🛠️ Quy Tắc Development

### Code Style

- Files/Folders: `kebab-case`
- React Components: `PascalCase`
- Variables/Functions: `camelCase`
- Constants: `UPPER_CASE`

### API Response Format

```javascript
// Success
{
  "success": true,
  "data": { /* payload */ },
  "message": "Thao tác thành công"
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ"
  }
}
```

### Commit Message

```
<type>: <subject>

# Types: feat, fix, refactor, docs, style, test, chore

# Ví dụ:
feat: thêm API tìm kiếm mất rừng

- Thêm endpoint GET /api/search/mat-rung
- Hỗ trợ filter theo tỉnh, huyện, xã
- Thêm pagination
```

## 📖 Tài Liệu

- [CLAUDE.md](CLAUDE.md) - Hướng dẫn đầy đủ cho Claude Code
- [QUICK_START_DEPLOY.md](QUICK_START_DEPLOY.md) - Hướng dẫn deploy nhanh
- [DEPLOY_WINDOWS_SERVER.md](DEPLOY_WINDOWS_SERVER.md) - Chi tiết deployment
- [HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md) - Hướng dẫn sử dụng

## 🔧 Troubleshooting

**Port conflicts**
```bash
netstat -ano | findstr :3000
```

**Database connection failed**
```bash
# Kiểm tra PostgreSQL
Get-Service postgresql*
Start-Service postgresql-x64-15
```

**Prisma issues**
```bash
cd microservices/services/auth-service
npx prisma generate
npx prisma migrate deploy
```

## 📊 Monitoring (Production)

```powershell
# Xem status services
pm2 status

# Xem logs
pm2 logs
pm2 logs gateway

# Restart
pm2 restart all
```

## 🔐 Security Checklist

- ✅ Environment variables cho secrets
- ✅ Input validation & sanitization
- ✅ Parameterized queries (SQL injection prevention)
- ✅ JWT authentication
- ❌ KHÔNG commit secrets vào git
- ❌ KHÔNG trust user input

## 📦 Initial Data

Database SQL dumps cho seeding: `docker/initial-data/`
- `auth_db.sql` - Users, roles, permissions
- `gis_db.sql` - GIS data, layers
- `admin_db.sql` - Administrative data

## 📞 Support

Xem [CLAUDE.md](CLAUDE.md) để biết chi tiết về:
- Kiến trúc hệ thống
- Quy trình development
- Thêm service mới
- Database migrations
- Best practices

---

Made with ❤️ for forest monitoring
