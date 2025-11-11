# Troubleshooting Guide - Du Bao Mat Rung

Hướng dẫn giải quyết các vấn đề thường gặp khi deploy ứng dụng.

---

## 🚀 Quick Fix Scripts

### 1. **fix-all-services.ps1** - Full Rebuild (Khuyến nghị nếu có lỗi)

Sử dụng khi:
- Lần đầu tiên setup
- Services bị lỗi 502, 503, hoặc connection errors
- Sau khi cập nhật docker-compose.yml
- Database connection errors

```powershell
.\fix-all-services.ps1
```

**Thời gian**: 10-15 phút
**Chức năng**:
- Stop tất cả containers
- Rebuild tất cả service images với config mới
- Start databases trước, đợi healthy
- Start tất cả services theo đúng thứ tự
- Test tất cả services

---

### 2. **restart-all-services.ps1** - Quick Restart

Sử dụng khi:
- Services đã được build đúng, chỉ cần restart
- Sau khi thay đổi .env file
- Services bị treo hoặc chạy chậm

```powershell
.\restart-all-services.ps1
```

**Thời gian**: 2-3 phút
**Chức năng**:
- Restart tất cả containers
- Test tất cả services

---

### 3. **fix-database-connection.ps1** - Fix Database Issues

Sử dụng khi:
- Database connection errors
- "Can't reach database server" errors

```powershell
.\fix-database-connection.ps1
```

---

### 4. **fix-mapserver.ps1** - Fix MapServer Issues

Sử dụng khi:
- MapServer trả về 503
- WMS/WFS requests fail
- Map không hiển thị trên web

```powershell
.\fix-mapserver.ps1
```

---

## 🔍 Common Errors

### ❌ Error 1: "502 Bad Gateway" hoặc "503 Service Unavailable"

**Nguyên nhân**: Services không thể kết nối với nhau hoặc databases

**Giải pháp**:
```powershell
# Option 1: Full rebuild (khuyến nghị)
.\fix-all-services.ps1

# Option 2: Quick restart
.\restart-all-services.ps1

# Option 3: Manual check
docker ps -a                    # Kiểm tra containers
docker logs dubaomatrung-auth   # Xem logs của service bị lỗi
```

---

### ❌ Error 2: "Can't reach database server at localhost:5433"

**Nguyên nhân**: Services đang dùng localhost thay vì Docker service names

**Giải pháp**:
```powershell
.\fix-database-connection.ps1
```

**Giải thích**:
- Trong Docker, services phải dùng service name (vd: `postgres`, `postgis`) thay vì `localhost`
- Script này sẽ rebuild services với DATABASE_URL đúng

---

### ❌ Error 3: MapServer 503 errors / Map không hiển thị

**Nguyên nhân**: Gateway không thể routing đến MapServer

**Giải pháp**:
```powershell
.\fix-mapserver.ps1
```

---

### ❌ Error 4: Services không start sau khi rebuild

**Giải pháp**:

```powershell
# 1. Check logs
docker-compose logs -f auth-service
docker-compose logs -f gateway

# 2. Check container status
docker ps -a

# 3. Check databases
docker logs dubaomatrung-postgres
docker logs dubaomatrung-postgis

# 4. Restart specific service
docker-compose restart auth-service

# 5. If all else fails, complete reset
docker-compose down -v          # Warning: This deletes all data!
.\fix-all-services.ps1
```

---

### ❌ Error 5: "Prisma error" hoặc database migration errors

**Giải pháp**:

```powershell
# 1. Enter auth service container
docker exec -it dubaomatrung-auth sh

# 2. Run migrations
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Exit and restart
exit
docker-compose restart auth-service
```

---

## 📊 Useful Commands

### Check Service Status

```powershell
# All containers
docker ps

# Specific service logs
docker logs -f dubaomatrung-gateway
docker logs -f dubaomatrung-auth
docker logs -f dubaomatrung-mapserver

# Follow logs of multiple services
docker-compose logs -f gateway auth-service gis-service

# Check service health
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/health  # Auth
curl http://localhost:3007/health  # MapServer
```

---

### Database Operations

```powershell
# Connect to PostgreSQL
docker exec -it dubaomatrung-postgres psql -U postgres -d auth_db

# Check database exists
docker exec -it dubaomatrung-postgres psql -U postgres -c "\l"

# Export database
docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > auth_db_backup.sql

# Import database
docker exec -i dubaomatrung-postgres psql -U postgres auth_db < auth_db_backup.sql
```

---

### Performance Monitoring

```powershell
# Resource usage
docker stats

# Network inspection
docker network inspect dubaomatrung-network

# Disk usage
docker system df
```

---

## 🛠️ Manual Fixes

### Rebuild Single Service

```powershell
# Stop service
docker-compose stop auth-service

# Rebuild
docker-compose build --no-cache auth-service

# Start
docker-compose up -d auth-service

# Check logs
docker logs -f dubaomatrung-auth
```

---

### Reset Everything (Last Resort)

```powershell
# WARNING: This deletes all data including databases!

# 1. Stop and remove everything
docker-compose down -v

# 2. Remove all images (optional)
docker system prune -a

# 3. Full rebuild
.\fix-all-services.ps1
```

---

## 📝 Configuration Files

### Important Files:
- `.env` - Environment variables (DB_PASSWORD, JWT_SECRET)
- `docker-compose.yml` - Service configuration
- `microservices/services/*/prisma/schema.prisma` - Database schemas

### Environment Variables to Check:

```env
# .env file
DB_PASSWORD=4
JWT_SECRET=gTj+MGQ0cr5V3i9vV8JSKW+uCDWvxDDlBCQVzgJDwWc=
NODE_ENV=production
VITE_API_URL=http://103.56.161.239:3000  # Update with your server IP
```

---

## 🔗 Service URLs

### Local Development:
- Frontend: http://localhost:5173
- Gateway: http://localhost:3000
- Auth: http://localhost:3001
- User: http://localhost:3002
- GIS: http://localhost:3003
- Report: http://localhost:3004
- Admin: http://localhost:3005
- Search: http://localhost:3006
- MapServer: http://localhost:3007

### API Documentation:
- Gateway: http://localhost:3000/api-docs
- Auth: http://localhost:3001/api-docs
- User: http://localhost:3002/api-docs
- GIS: http://localhost:3003/api-docs

---

## 🆘 Still Having Issues?

1. Check this file first: `DEPLOYMENT_GUIDE.md`
2. Check Docker Desktop is running
3. Check `.env` file has correct values
4. Try full rebuild: `.\fix-all-services.ps1`
5. Check logs: `docker-compose logs -f`

---

## 📞 Support

If you're still having issues after trying all the above:

1. Collect logs:
```powershell
docker-compose logs > all-logs.txt
docker ps -a > containers-status.txt
```

2. Check GitHub Issues
3. Contact the development team with logs attached
