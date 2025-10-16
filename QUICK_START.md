# Quick Start Guide

## Prerequisites Check

Trước khi chạy, hãy đảm bảo:

```bash
# 1. Kiểm tra Node.js
node --version  # Should be >= 18.x

# 2. Kiểm tra PostgreSQL
psql --version

# 3. Kiểm tra Docker
docker --version

# 4. Kiểm tra databases
psql -U postgres -l | grep -E "auth_db|gis_db|admin_db"
```

## Setup (Chỉ cần làm 1 lần)

### 1. Khởi động MongoDB

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_DATABASE=logging_db \
  mongo:latest
```

### 2. Cài đặt Dependencies

```bash
# Cài tất cả dependencies trong 1 lệnh
npm run install:all
```

Hoặc cài thủ công:

```bash
# Gateway
cd microservices/gateway && npm install && cd ../..

# Services
cd microservices/services/auth-service && npm install && cd ../../..
cd microservices/services/gis-service && npm install && cd ../../..
cd microservices/services/admin-service && npm install && cd ../../..
cd microservices/services/user-service && npm install && cd ../../..
cd microservices/services/report-service && npm install && cd ../../..
cd microservices/services/search-service && npm install && cd ../../..
cd microservices/services/mapserver-service && npm install && cd ../../..

# Client
cd client && npm install && cd ..
```

### 3. Setup Prisma (auth-service)

```bash
cd microservices/services/auth-service
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed  # Tạo admin user và test data
cd ../../..
```

### 4. Tạo Databases (nếu chưa có)

```bash
psql -U postgres -c "CREATE DATABASE auth_db;"
psql -U postgres -c "CREATE DATABASE gis_db;"
psql -U postgres -c "CREATE DATABASE admin_db;"

# Enable PostGIS
psql -U postgres -d gis_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U postgres -d admin_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Running the Application

### Quick Start - Chạy tất cả

```bash
npm run dev
```

Lệnh này sẽ khởi động:
- Gateway (port 3000)
- All microservices (ports 3001-3006)
- Frontend (port 5173)

### Hoặc chạy từng phần

#### Backend Only

```bash
cd microservices
npm run dev
```

#### Frontend Only

```bash
cd client
npm run dev
```

#### Individual Services

```bash
# Gateway
cd microservices/gateway && npm run dev

# Auth Service
cd microservices/services/auth-service && npm run dev

# GIS Service
cd microservices/services/gis-service && npm run dev

# Admin Service
cd microservices/services/admin-service && npm run dev
```

## Verify Everything is Running

### Check Services

```bash
# Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# GIS Service
curl http://localhost:3003/health

# Admin Service
curl http://localhost:3005/health
```

### Check MongoDB

```bash
docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"
```

### Check PostgreSQL

```bash
psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE '%_db';"
```

## Access the Application

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

## Default Credentials

After running `npm run prisma:seed`, you can login with:

**Admin User:**
```
Username: admin
Password: Admin@123#
```

**GIS Specialist:**
```
Username: gis_user
Password: Gis@123#
```

**Viewer (Read-only):**
```
Username: viewer
Password: Viewer@123#
```

## Common Issues

### MongoDB Authentication Error

```bash
# Stop and recreate without auth
docker stop mongodb && docker rm mongodb
docker run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:latest
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Prisma Migration Error

```bash
cd microservices/services/auth-service
npx prisma migrate reset
npx prisma migrate dev
```

### Missing Dependencies

```bash
# auth-service
cd microservices/services/auth-service
npm install @prisma/client prisma

# gis-service
cd microservices/services/gis-service
npm install kysely pg

# admin-service
cd microservices/services/admin-service
npm install kysely pg

# report-service
cd microservices/services/report-service
npm install pdfkit

# mapserver-service
cd microservices/services/mapserver-service
npm install winston
```

### Services Not Starting

Check logs in the terminal for specific errors. Most common issues:
1. Missing environment variables - copy `.env.example` to `.env`
2. Database not running - check PostgreSQL and MongoDB
3. Port conflicts - kill processes using the ports

## Development Tips

### Hot Reload

All services use nodemon for hot reload. Just save your files and they'll restart automatically.

### View Logs

```bash
# Gateway logs
tail -f microservices/gateway/logs/combined.log

# Service logs
tail -f microservices/services/*/logs/combined.log
```

### Run Tests

```bash
# All tests
npm test

# E2E tests only
cd microservices/tests
npm run test:e2e
```

### Database Migrations

```bash
# Create new migration
cd microservices/services/auth-service
npx prisma migrate dev --name <migration-name>

# Apply migrations
npx prisma migrate deploy
```

## Stopping the Application

```bash
# Stop all Node processes
pkill -f node

# Stop MongoDB
docker stop mongodb

# Or use Ctrl+C in the terminal where npm run dev is running
```

## Clean Start

If something is really broken:

```bash
# 1. Stop everything
pkill -f node
docker stop mongodb

# 2. Clean node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# 3. Clean Prisma
cd microservices/services/auth-service
npx prisma migrate reset --force

# 4. Reinstall
npm run install:all

# 5. Restart
npm run dev
```

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [API Documentation](http://localhost:3000/api-docs) when services are running
- See [DEPRECATED.md](./microservices/database/DEPRECATED.md) for migration notes
