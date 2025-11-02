# 📋 Docker Deployment Restructure - Changes Log

## 🎯 Tổng quan thay đổi

Đã tái cấu trúc toàn bộ Docker deployment theo yêu cầu:
- ✅ Dọn dẹp file cũ và không cần thiết
- ✅ Tự động import database từ `docker-init/` khi chạy lần đầu
- ✅ Script PowerShell dễ dùng cho Windows
- ✅ Hướng dẫn chi tiết từng bước

---

## 📁 Files đã thay đổi

### ✨ Files MỚI tạo

1. **deploy.ps1** - Script deployment chính
   - Deploy lần đầu: `.\deploy.ps1 -FirstTime`
   - Stop/Restart/Rebuild services
   - Xem logs
   - Clean all

2. **update.ps1** - Script update code nhanh
   - Auto-detect changes: `.\update.ps1 -AutoDetect`
   - Update service cụ thể: `.\update.ps1 -Services client,auth-service`
   - Interactive mode

3. **DEPLOYMENT.md** - Hướng dẫn deployment chi tiết
   - Deployment lần đầu
   - Update code workflow
   - Troubleshooting
   - Tips & tricks

4. **QUICKSTART.md** - Hướng dẫn nhanh 3 bước
   - Quick start cho người mới
   - Các lệnh thường dùng

5. **.env.example** - Template environment variables
   - Tất cả biến môi trường cần thiết
   - Production checklist

6. **docker-init/README.md** - Hướng dẫn database initialization
   - Cách database auto-import hoạt động
   - Export/Import manual
   - Troubleshooting database issues

### 🔧 Files ĐÃ CẬP NHẬT

1. **docker-compose.yml**
   - Thêm `POSTGRES_DB` env vars
   - Optimized healthcheck với `start_period`
   - Mount docker-init volumes với `:ro` (read-only)
   - Improved database healthchecks

2. **.dockerignore**
   - Tối ưu để giảm build context
   - Loại bỏ files không cần thiết
   - Giảm thời gian build

### 🗑️ Files ĐÃ XÓA

1. **deploy-docker.ps1** - Thay bằng deploy.ps1
2. **deploy-docker-dev.ps1** - Không cần thiết với cách deploy mới
3. **quick-update.ps1** - Thay bằng update.ps1
4. **fix-and-deploy.ps1** - Không cần thiết
5. **deploy-docker-with-db.ps1** - Chức năng đã có trong deploy.ps1

---

## 🚀 Cách sử dụng

### Lần đầu tiên (trên Windows Server)

```powershell
cd C:\DuBaoMatRung

# 1. Tạo .env
copy .env.example .env
notepad .env  # Đổi DB_PASSWORD, JWT_SECRET, VITE_API_URL

# 2. Deploy
.\deploy.ps1 -FirstTime
```

### Update code sau này

```powershell
# Tự động phát hiện thay đổi
.\update.ps1 -AutoDetect

# Hoặc manual
.\update.ps1 -Services client,auth-service
```

### Xem logs

```powershell
.\deploy.ps1 -Logs
.\deploy.ps1 -Logs -Service auth-service
```

### Stop/Restart

```powershell
.\deploy.ps1 -Stop
.\deploy.ps1 -Restart
```

---

## 💡 Đặc điểm chính

### 1. Auto Database Import

PostgreSQL containers tự động import SQL files từ `docker-init/`:
- `docker-init/postgres/` → auth_db
- `docker-init/postgis/` → gis_db  
- `docker-init/admin-postgis/` → admin_db

**Chỉ chạy lần đầu tiên** khi volume database còn trống.

### 2. One-Command Deployment

```powershell
.\deploy.ps1 -FirstTime
```

Tự động:
- Pull images
- Build services
- Start containers
- Import databases

### 3. Smart Update

```powershell
.\update.ps1 -AutoDetect
```

Tự động:
- Phát hiện files đã thay đổi (từ git)
- Chỉ rebuild services bị ảnh hưởng
- Nhanh hơn nhiều so với rebuild all

### 4. Clean Structure

Không còn file rác:
- Tất cả scripts trong 2 files: `deploy.ps1` và `update.ps1`
- Tài liệu rõ ràng, dễ hiểu
- Environment variables tập trung trong `.env`

---

## 🔄 Migration từ setup cũ

Nếu đang dùng setup cũ với `deploy-docker.ps1`:

```powershell
# 1. Stop containers cũ
docker-compose down

# 2. (Optional) Backup database nếu cần
docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > backup.sql

# 3. (Optional) Xóa volumes để import database mới
docker-compose down -v

# 4. Deploy với script mới
.\deploy.ps1 -FirstTime
```

---

## 📚 Tài liệu

1. **QUICKSTART.md** - Đọc đầu tiên (3 bước deploy)
2. **DEPLOYMENT.md** - Hướng dẫn chi tiết đầy đủ
3. **docker-init/README.md** - Về database initialization
4. **.env.example** - Template environment variables

---

## 🎓 Best Practices

### Development Workflow

```powershell
# 1. Develop trên local machine
git clone ...
npm run dev

# 2. Commit và push
git commit -m "Add new feature"
git push

# 3. Deploy lên server
cd C:\DuBaoMatRung
git pull
.\update.ps1 -AutoDetect
```

### Production Checklist

- [ ] Đổi `DB_PASSWORD` thành password mạnh
- [ ] Generate `JWT_SECRET` random (>= 32 chars)
- [ ] Đổi `VITE_API_URL` thành IP/domain server
- [ ] Set `NODE_ENV=production`
- [ ] Backup database định kỳ
- [ ] Chỉ mở port 3000 và 5173 ra internet

---

## 🐛 Troubleshooting

### Container không start?
```powershell
.\deploy.ps1 -Logs -Service <service-name>
.\deploy.ps1 -Restart -Service <service-name>
```

### Database không import?
```powershell
# Check logs
.\deploy.ps1 -Logs -Service postgres

# Nếu volume đã có data, PostgreSQL skip import
# Phải xóa volume để import lại:
docker-compose down -v
.\deploy.ps1 -FirstTime
```

### Update code không áp dụng?
```powershell
# Rebuild service cụ thể
.\deploy.ps1 -Rebuild -Service client

# Hoặc rebuild all với no-cache
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 So sánh trước và sau

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| Scripts | 5 files riêng lẻ | 2 files tổng hợp |
| Database import | Manual | Auto (lần đầu) |
| Update code | Rebuild all (~10 phút) | Auto-detect (~1-3 phút) |
| Documentation | Rải rác | Tập trung, rõ ràng |
| .dockerignore | Basic | Optimized |
| Healthcheck | Basic | Advanced với start_period |

---

## 🔐 Security Improvements

1. Database volumes mount `:ro` (read-only)
2. `.env.example` với production checklist
3. Hướng dẫn firewall và port management
4. Best practices cho password và JWT secret

---

**Ngày thực hiện:** 2025-01-02  
**Thực hiện bởi:** Claude Code DevOps Agent  
**Version:** 2.0
