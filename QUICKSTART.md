# ⚡ Quick Start Guide - Windows Deployment

## 🚀 Deployment trong 3 bước

### Bước 1: Chuẩn bị
```powershell
# Mở PowerShell as Administrator
cd C:\DuBaoMatRung

# Kiểm tra Docker đang chạy
docker --version
```

### Bước 2: Tạo file .env
```powershell
# Copy .env.example thành .env
copy .env.example .env

# Sửa file .env (thay đổi password, JWT secret, API URL)
notepad .env
```

**Quan trọng:** Đổi các giá trị sau trong `.env`:
- `DB_PASSWORD` - Password cho database
- `JWT_SECRET` - JWT secret key (tối thiểu 32 ký tự)
- `VITE_API_URL` - URL API của server (http://YOUR_SERVER_IP:3000)

### Bước 3: Deploy
```powershell
# Deploy lần đầu (10-20 phút)
.\deploy.ps1 -FirstTime
```

**Xong!** Truy cập:
- Frontend: http://localhost:5173 hoặc http://YOUR_SERVER_IP:5173
- API Gateway: http://localhost:3000 hoặc http://YOUR_SERVER_IP:3000

---

## 🔄 Update code

```powershell
# Pull code mới và tự động update (KHUYẾN NGHỊ) ⭐
.\update.ps1 -Pull

# Hoặc tự pull rồi auto-detect:
git pull
.\update.ps1 -AutoDetect

# Hoặc update service cụ thể:
.\update.ps1 -Services client,auth-service
```

---

## 🛠️ Các lệnh hữu ích

```powershell
# Xem logs
.\deploy.ps1 -Logs

# Stop services
.\deploy.ps1 -Stop

# Restart services
.\deploy.ps1 -Restart

# Rebuild tất cả
.\deploy.ps1 -Rebuild

# Xem status
docker-compose ps
```

---

## 📖 Tài liệu đầy đủ

Xem file [DEPLOYMENT.md](DEPLOYMENT.md) để biết thêm chi tiết.

---

## ❓ Gặp vấn đề?

1. Xem logs: `.\deploy.ps1 -Logs`
2. Check status: `docker-compose ps`
3. Restart: `.\deploy.ps1 -Restart`
4. Full reset: `docker-compose down -v && .\deploy.ps1 -FirstTime`

---

**Lưu ý:** Database lớn (2.5GB) nên lần đầu import có thể mất 5-10 phút. Kiên nhẫn chờ nhé!









  # Pull code mới
  git pull

  # Rebuild CHÍNH gateway
  docker-compose build gateway

  # Restart gateway
  docker-compose up -d gateway

  # Check
  docker ps | findstr gateway
  docker logs dubaomatrung-gateway --tail 20