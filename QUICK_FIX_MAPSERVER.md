# Quick Fix: MapServer 500 Error trên Windows

## Vấn đề
Bạn đang gặp lỗi 500 khi request đến MapServer API trên Windows server tại `http://103.56.160.66:8080/api/mapserver`

## Nguyên nhân
MapServer service đang hard-code đường dẫn Linux (`/usr/bin/mapserv`) thay vì sử dụng đường dẫn Windows.

## Giải pháp nhanh (3 bước)

### Bước 1: Cài đặt MS4W

```powershell
# Download MS4W từ https://ms4w.com/
# Giải nén vào C:\ms4w\
# Kiểm tra file tồn tại:
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"
```

### Bước 2: Tạo file .env cho MapServer service

Tạo file `C:\DuBaoMatRung\microservices\services\mapserver-service\.env`:

```env
NODE_ENV=production
PORT=3008

MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles\laocai.map
```

**LƯU Ý QUAN TRỌNG:**
- Thay đổi đường dẫn `C:\DuBaoMatRung` theo vị trí thực tế project của bạn
- Đảm bảo file `laocai.map` tồn tại tại đường dẫn chỉ định

### Bước 3: Restart MapServer service

```powershell
# Nếu đang dùng PM2
pm2 restart mapserver-service

# Hoặc restart tất cả services
pm2 restart all

# Kiểm tra logs
pm2 logs mapserver-service --lines 50
```

## Kiểm tra kết quả

```powershell
# Test health check
curl http://localhost:3008/health

# Test WMS GetCapabilities
curl "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

# Test qua Gateway
curl "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

## Nếu vẫn lỗi

### 1. Chạy setup script (tự động)

```powershell
cd C:\DuBaoMatRung\scripts\windows
.\setup-mapserver.ps1
```

### 2. Kiểm tra logs chi tiết

```powershell
pm2 logs mapserver-service
```

### 3. Các lỗi thường gặp

**Lỗi: "mapserv.exe not found"**
- Kiểm tra MS4W đã cài đặt đúng chưa
- Kiểm tra đường dẫn trong `.env` có chính xác không

**Lỗi: "MapFile not found"**
- Kiểm tra file `laocai.map` có tồn tại không
- Kiểm tra đường dẫn trong `.env` có đúng không (dùng absolute path)

**Lỗi: Database connection**
- Kiểm tra PostgreSQL đang chạy: `net start postgresql*`
- Kiểm tra connection string trong file `laocai.map`
- Test connection: `psql -U postgres -d admin_db -c "SELECT 1"`

**Lỗi: Permission denied**
```powershell
# Tạo và cấp quyền cho thư mục tmp
mkdir C:\DuBaoMatRung\mapserver\tmp
icacls "C:\DuBaoMatRung\mapserver\tmp" /grant Everyone:F /T
```

## Files đã được cập nhật

### 1. Code changes
- ✅ `microservices/services/mapserver-service/src/index.js` - Hỗ trợ cả Linux và Windows

### 2. Configuration files
- ✅ `microservices/services/mapserver-service/.env.windows` - Template cho Windows
- ✅ `WINDOWS_DEPLOYMENT.md` - Hướng dẫn deploy đầy đủ
- ✅ `MAPSERVER_WINDOWS_FIX.md` - Chi tiết về fix này

### 3. Scripts
- ✅ `scripts/windows/setup-mapserver.ps1` - Auto setup
- ✅ `scripts/windows/test-mapserver.ps1` - Test service

## Đã pull code mới từ Git chưa?

Nếu bạn đã có code cũ trên server, hãy pull code mới:

```powershell
cd C:\DuBaoMatRung
git pull origin main

# Cập nhật dependencies
cd microservices\services\mapserver-service
npm install
```

## Cấu trúc thư mục cần thiết

```
C:\DuBaoMatRung\
├── mapserver\
│   ├── mapfiles\
│   │   └── laocai.map          # MapFile chính
│   └── tmp\                     # Thư mục tạm (cần tạo)
└── microservices\
    └── services\
        └── mapserver-service\
            ├── src\
            │   └── index.js     # Code đã fix
            └── .env             # Cấu hình Windows
```

## Support

Nếu vẫn gặp vấn đề:
1. Check logs: `pm2 logs mapserver-service --lines 100`
2. Check PM2 status: `pm2 status`
3. Check file tồn tại: `Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"`
4. Check PostgreSQL: `net start postgresql*`

---

**Tóm tắt:** Vấn đề chính là đường dẫn MapServer binary. Tạo file `.env` với đường dẫn Windows đúng và restart service là xong! 🚀
