# Hướng Dẫn Deploy Lên Windows Server

Hướng dẫn này giúp bạn deploy toàn bộ hệ thống lên Windows Server sử dụng Docker với database được import sẵn.

## 📋 Yêu Cầu

### Trên Windows Server (103.56.161.239)

1. **Docker Desktop for Windows** đã cài đặt và đang chạy
   - Download: https://www.docker.com/products/docker-desktop/
   - Yêu cầu: Windows Server 2019 trở lên

2. **Git** (để clone code)
   - Download: https://git-scm.com/download/win

3. **Cổng mở** (firewall):
   - 80 (Frontend - Nginx)
   - 3000 (API Gateway)
   - 5432 (PostgreSQL - nếu cần truy cập từ bên ngoài)
   - 5433 (PostGIS - nếu cần truy cập từ bên ngoài)

### Trên Máy Development (để export database)

1. **PostgreSQL Client Tools** (pg_dump)
   - Linux: `sudo pacman -S postgresql` hoặc `sudo apt install postgresql-client`
   - macOS: `brew install postgresql`

2. **Bash** (để chạy export script)

## 🔄 Quy Trình Deploy

### Bước 1: Export Databases Từ Máy Development

Trên máy development hiện tại (nơi có database đang chạy):

```bash
# Chạy script export
./export-databases.sh
```

Script sẽ tạo các file:
- `docker-init/postgres/01-auth-db.sql` (~32KB) - Database authentication/users
- `docker-init/postgis/01-gis-db.sql` (~12MB) - Database GIS với dữ liệu mặt rừng

**Lưu ý:** Đây là dữ liệu **CHÍNH XÁC 100%** từ môi trường development của bạn.

### Bước 2: Copy Project Lên Windows Server

#### Option 1: Sử dụng Git (Khuyến nghị)

Trên Windows Server:

```powershell
# Clone repository
git clone <repository-url> C:\dubaomatrung
cd C:\dubaomatrung
```

Sau đó copy thư mục `docker-init/` từ máy development:
- Sử dụng SCP, FTP, hoặc Remote Desktop
- Copy toàn bộ folder `docker-init/` vào `C:\dubaomatrung\`

#### Option 2: Copy Toàn Bộ Project

- Nén toàn bộ project thành ZIP trên máy development
- Upload lên Windows Server
- Giải nén tại `C:\dubaomatrung`

### Bước 3: Kiểm Tra File Cấu Hình

Trên Windows Server, kiểm tra file `.env.docker`:

```powershell
# Copy template
cp .env.docker .env

# Chỉnh sửa nếu cần (mật khẩu database, JWT secret, v.v.)
notepad .env
```

**Cấu hình quan trọng:**

```env
# Database Password (dùng chung cho PostgreSQL và PostGIS)
DB_PASSWORD=your_secure_password_here

# JWT Secret (để mã hóa token)
JWT_SECRET=your_jwt_secret_key_here

# Environment
NODE_ENV=production
```

### Bước 4: Deploy

```powershell
# Deploy lần đầu (build images và start)
.\deploy-docker-with-db.ps1 -Rebuild

# Deploy lần sau (chỉ restart, không build lại)
.\deploy-docker-with-db.ps1
```

**Lưu ý quan trọng:**
- Lần đầu deploy sẽ mất **2-5 phút** để:
  - Build Docker images
  - Khởi tạo databases
  - Import SQL files (~12MB dữ liệu)
- Các lần sau chỉ mất **30-60 giây**

### Bước 5: Kiểm Tra

```powershell
# Xem trạng thái containers
docker-compose ps

# Xem logs
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f auth-service
docker-compose logs -f gis-service
```

**Containers phải có trạng thái:**
```
NAME                       STATUS
dubaomatrung-postgres      Up (healthy)
dubaomatrung-postgis       Up (healthy)
dubaomatrung-mongodb       Up (healthy)
dubaomatrung-redis         Up (healthy)
dubaomatrung-gateway       Up (healthy)
dubaomatrung-auth          Up (healthy)
dubaomatrung-user          Up (healthy)
dubaomatrung-gis           Up (healthy)
dubaomatrung-report        Up (healthy)
dubaomatrung-admin         Up (healthy)
dubaomatrung-search        Up (healthy)
dubaomatrung-frontend      Up (healthy)
```

### Bước 6: Test Đăng Nhập

Mở trình duyệt và truy cập:
- **Frontend**: http://103.56.161.239 hoặc http://localhost
- **API Gateway**: http://103.56.161.239:3000

**Thông tin đăng nhập mặc định** (từ database được import):
- Username: `admin`
- Password: `admin123`

## 🔧 Xử Lý Sự Cố

### Lỗi: "Missing database exports"

```
✗ Missing: docker-init/postgres/01-auth-db.sql
```

**Nguyên nhân:** Chưa copy folder `docker-init/` từ máy development

**Giải pháp:**
1. Chạy `./export-databases.sh` trên máy development
2. Copy toàn bộ folder `docker-init/` lên Windows Server

### Lỗi: "Docker is not running"

```
✗ Docker is not running. Please start Docker Desktop.
```

**Giải pháp:**
1. Mở Docker Desktop
2. Đợi Docker khởi động xong
3. Chạy lại script deploy

### Lỗi: Containers không healthy

```powershell
# Xem chi tiết logs
docker-compose logs -f [service-name]

# Kiểm tra health
docker inspect dubaomatrung-postgres | grep -A 10 Health
```

**Các lỗi phổ biến:**
1. **Database chưa sẵn sàng:** Đợi thêm 30-60 giây
2. **Port conflict:** Kiểm tra port đã bị chiếm chưa với `netstat -an | findstr "5432"`
3. **Permission denied:** Chạy PowerShell với quyền Administrator

### Lỗi: Không đăng nhập được

**Kiểm tra:**

```powershell
# Kiểm tra auth-service logs
docker-compose logs -f auth-service

# Kiểm tra database đã có dữ liệu chưa
docker exec -it dubaomatrung-postgres psql -U postgres -d auth_db -c "\dt"
```

**Nếu database rỗng:**
- Import chưa thành công
- Chạy lại với `-Clean` flag:
  ```powershell
  .\deploy-docker-with-db.ps1 -Rebuild -Clean
  ```

## 📊 Quản Lý Database

### Backup Database

```powershell
# Backup auth_db
docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > backup-auth-$(Get-Date -Format 'yyyyMMdd').sql

# Backup gis_db
docker exec dubaomatrung-postgis pg_dump -U postgres gis_db > backup-gis-$(Get-Date -Format 'yyyyMMdd').sql
```

### Restore Database

```powershell
# Stop services
docker-compose stop auth-service user-service

# Restore
Get-Content backup-auth-20250101.sql | docker exec -i dubaomatrung-postgres psql -U postgres -d auth_db

# Restart services
docker-compose start auth-service user-service
```

### Truy Cập Database Trực Tiếp

```powershell
# PostgreSQL (auth_db)
docker exec -it dubaomatrung-postgres psql -U postgres -d auth_db

# PostGIS (gis_db)
docker exec -it dubaomatrung-postgis psql -U postgres -d gis_db

# MongoDB
docker exec -it dubaomatrung-mongodb mongosh logging_db

# Redis
docker exec -it dubaomatrung-redis redis-cli
```

## 🔄 Update Code

Khi có code mới:

```powershell
# Pull code mới
git pull

# Rebuild và restart
.\deploy-docker-with-db.ps1 -Rebuild
```

**Lưu ý:** Database không bị mất khi rebuild, chỉ có code được cập nhật.

## 🛑 Dừng Hệ Thống

```powershell
# Dừng tất cả services (giữ nguyên data)
docker-compose stop

# Dừng và xóa containers (giữ nguyên data)
docker-compose down

# Dừng và XÓA TẤT CẢ (bao gồm data) - NGUY HIỂM!
docker-compose down -v
```

## 📈 Giám Sát

### Xem Resource Usage

```powershell
# CPU, Memory usage
docker stats

# Disk usage
docker system df
```

### Xem Logs Realtime

```powershell
# Tất cả services
docker-compose logs -f

# Chỉ errors
docker-compose logs -f | Select-String "ERROR"

# Specific service
docker-compose logs -f auth-service
```

## 🔐 Security Checklist

- [ ] Đổi `DB_PASSWORD` trong `.env`
- [ ] Đổi `JWT_SECRET` trong `.env`
- [ ] Đổi mật khẩu admin mặc định sau khi login lần đầu
- [ ] Cấu hình firewall chỉ mở port cần thiết
- [ ] Bật HTTPS (cần reverse proxy như Nginx)
- [ ] Backup database định kỳ
- [ ] Giới hạn truy cập SSH/RDP vào server

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: `docker-compose logs -f`
2. Kiểm tra health: `docker-compose ps`
3. Xem thông tin chi tiết container: `docker inspect <container-name>`
4. Liên hệ team development

---

**Phiên bản:** 1.0
**Ngày cập nhật:** 2025-11-01
