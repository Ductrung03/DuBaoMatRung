# ⚡ Quick Start - 3 Bước Deploy

## Bước 1: Cài Docker Desktop

Download: https://www.docker.com/products/docker-desktop

- Cài đặt và khởi động Docker Desktop
- Đợi đến khi Docker icon hiển thị "Docker Desktop is running"

---

## Bước 2: Setup môi trường

Mở PowerShell:

```powershell
cd C:\DuBaoMatRung

# Copy file .env
Copy-Item .env.docker .env

# Sửa password
notepad .env
```

**Thay đổi 2 dòng này:**
```env
DB_PASSWORD=your_secure_password_here  # ← Đổi thành password của bạn
JWT_SECRET=your_jwt_secret_here        # ← Đổi thành bất kỳ chuỗi ngẫu nhiên
```

Ví dụ:
```env
DB_PASSWORD=MySecurePass123!
JWT_SECRET=my-super-secret-jwt-key-2025
```

Save và đóng.

---

## Bước 3: Deploy!

```powershell
.\deploy-docker.ps1 -FirstTime
```

**Chờ 5-10 phút** (lần đầu tiên)

Docker sẽ tự động:
- ✅ Tạo tất cả databases (PostgreSQL, PostGIS, MongoDB, Redis)
- ✅ Build tất cả services
- ✅ Khởi động ứng dụng
- ✅ Chạy database migrations và seed data

---

## ✅ Xong!

Truy cập:

- **Website**: http://103.56.161.239:5173
- **API**: http://103.56.161.239:3000
- **API Docs**: http://103.56.161.239:3000/api-docs

**Đăng nhập với:**
- Username: `admin`
- Password: `admin123`

---

## 🔄 Update code sau này

Khi có code mới:

```powershell
cd C:\DuBaoMatRung
.\deploy-docker.ps1
```

Chỉ mất 2-5 phút!

---

## 📋 Các lệnh hay dùng

```powershell
# Xem logs tất cả
docker-compose logs -f

# Xem logs 1 service cụ thể
docker-compose logs -f gateway
docker-compose logs -f auth-service

# Xem trạng thái
docker-compose ps

# Restart 1 service
docker-compose restart gateway

# Stop tất cả
.\deploy-docker.ps1 -Stop

# Rebuild từ đầu
.\deploy-docker.ps1 -Rebuild
```

---

## 🆘 Gặp vấn đề?

Xem hướng dẫn chi tiết: [DOCKER_SETUP.md](DOCKER_SETUP.md)
