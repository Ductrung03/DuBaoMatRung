# 🚀 FIX MAPSERVER NGAY - HƯỚNG DẪN NHANH

> **Dành cho LuckyBoiz** - Fix lỗi 500 MapServer trên Windows Server trong 5 phút!

---

## 🎯 Triệu chứng bạn đang gặp

```
❌ Failed to load resource: the server responded with a status of 500 (Internal Server Error)
❌ mapserver:1 Failed to load resource...
```

Màn hình trình duyệt hiển thị hàng trăm lỗi 500 từ endpoint `/api/mapserver`.

---

## ⚡ GIẢI PHÁP NHANH (5 phút)

### Bước 1: Chạy script chẩn đoán

```powershell
cd C:\DuBaoMatRung\scripts\windows
.\diagnose-mapserver.ps1
```

Script này sẽ kiểm tra và báo cáo tất cả vấn đề.

### Bước 2: Chạy script fix tự động

```powershell
.\fix-mapserver-complete.ps1 -AutoRestart
```

**Nếu project không ở `C:\DuBaoMatRung`:**
```powershell
.\fix-mapserver-complete.ps1 -ProjectPath "D:\YourPath" -AutoRestart
```

### Bước 3: Kiểm tra

```powershell
# Test service
.\test-mapserver.ps1

# Hoặc thủ công
curl http://localhost:3008/health
```

---

## 🔧 FIX THỦ CÔNG (nếu script không chạy)

### 1. Cài đặt MS4W (nếu chưa có)

```powershell
# Download từ https://ms4w.com/download.html
# Giải nén vào C:\ms4w\
# Kiểm tra file tồn tại:
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"
```

### 2. Tạo file .env

Tạo file: `C:\DuBaoMatRung\microservices\services\mapserver-service\.env`

```env
NODE_ENV=production
PORT=3008

MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles\laocai.map
```

**⚠️ LƯU Ý:** Thay `C:\DuBaoMatRung` bằng đường dẫn thực tế của project!

### 3. Tạo thư mục tmp

```powershell
mkdir C:\DuBaoMatRung\mapserver\tmp
icacls "C:\DuBaoMatRung\mapserver\tmp" /grant Everyone:F /T
```

### 4. Restart service

```powershell
pm2 restart mapserver-service

# Kiểm tra logs
pm2 logs mapserver-service --lines 20
```

---

## 🧪 KIỂM TRA KẾT QUẢ

### Test 1: Health Check
```powershell
curl http://localhost:3008/health
```
**Kết quả mong đợi:**
```json
{"status":"ok","service":"mapserver-service","mapfile":"C:\\DuBaoMatRung\\mapserver\\mapfiles\\laocai.map"}
```

### Test 2: WMS GetCapabilities
```powershell
curl "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```
**Kết quả:** Trả về XML với `<WMS_Capabilities>`

### Test 3: Qua Gateway
```powershell
curl "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

### Test 4: Từ bên ngoài
Mở trình duyệt:
```
http://103.56.160.66/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
```

---

## ❗ TROUBLESHOOTING

### Lỗi: "mapserv.exe not found"

**Nguyên nhân:** MS4W chưa cài đặt hoặc đường dẫn sai.

**Giải pháp:**
```powershell
# Kiểm tra file tồn tại
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# Nếu không tồn tại, tải và cài MS4W
# https://ms4w.com/download.html
```

### Lỗi: "MapFile not found"

**Nguyên nhân:** File `.map` không tồn tại.

**Giải pháp:**
```powershell
# Kiểm tra file MapFile
Test-Path "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"

# Nếu không có, cần tạo hoặc copy từ backup
```

### Lỗi: "Database connection failed"

**Nguyên nhân:** PostgreSQL không chạy hoặc connection string sai.

**Giải pháp:**
```powershell
# Kiểm tra PostgreSQL
net start postgresql*

# Test connection
psql -U postgres -d admin_db -c "SELECT 1"

# Sửa connection string trong file laocai.map:
# CONNECTION "host=localhost port=5432 dbname=admin_db user=postgres password=YOUR_PASSWORD"
```

### Lỗi: Service vẫn lỗi 500 sau khi fix

**Giải pháp:**
```powershell
# 1. Xem logs chi tiết
pm2 logs mapserver-service --lines 100

# 2. Stop và start lại
pm2 stop mapserver-service
pm2 start ecosystem.config.js --only mapserver-service

# 3. Restart tất cả services
pm2 restart all

# 4. Chạy lại diagnostic
cd C:\DuBaoMatRung\scripts\windows
.\diagnose-mapserver.ps1
```

### Lỗi: High restart count

**Nguyên nhân:** Service crash liên tục.

**Giải pháp:**
```powershell
# Xem error logs
pm2 logs mapserver-service --err

# Thường do:
# - MapFile không hợp lệ
# - Database connection sai
# - Thiếu dependencies

# Fix:
cd C:\DuBaoMatRung\microservices\services\mapserver-service
npm install
pm2 restart mapserver-service
```

---

## 📋 CHECKLIST HOÀN CHỈNH

Đánh dấu các bước đã hoàn thành:

- [ ] MS4W đã cài đặt tại `C:\ms4w\`
- [ ] File `.env` đã tạo với đường dẫn đúng
- [ ] Thư mục `tmp` đã tạo và có quyền
- [ ] MapFile tồn tại và hợp lệ
- [ ] PostgreSQL đang chạy
- [ ] Dependencies đã cài (`npm install`)
- [ ] Service đã restart (`pm2 restart mapserver-service`)
- [ ] Health check trả về OK
- [ ] WMS GetCapabilities hoạt động
- [ ] Không còn lỗi 500 trên browser

---

## 🎮 QUICK COMMANDS

```powershell
# Check status
pm2 status

# View logs
pm2 logs mapserver-service

# Restart service
pm2 restart mapserver-service

# Restart all
pm2 restart all

# Test endpoints
curl http://localhost:3008/health
curl http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities

# Check PostgreSQL
net start postgresql*
psql -U postgres -l

# Check MS4W
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"
```

---

## 📞 VẪN CÒN VẤN ĐỀ?

### Chạy full diagnostic:
```powershell
cd C:\DuBaoMatRung\scripts\windows
.\diagnose-mapserver.ps1 | Out-File diagnostic-report.txt
notepad diagnostic-report.txt
```

### Check từng bước:
```powershell
# 1. Check PM2
pm2 status

# 2. Check logs
pm2 logs mapserver-service --lines 50

# 3. Check ports
netstat -ano | findstr "3008"

# 4. Check files
dir C:\ms4w\Apache\cgi-bin\mapserv.exe
dir C:\DuBaoMatRung\mapserver\mapfiles\laocai.map
dir C:\DuBaoMatRung\microservices\services\mapserver-service\.env

# 5. Check PostgreSQL
net start postgresql*
```

---

## 🚀 SCRIPTS SUMMARY

| Script | Mục đích | Khi nào dùng |
|--------|----------|--------------|
| `fix-mapserver-complete.ps1` | Tự động fix tất cả | Lần đầu setup hoặc fix lỗi |
| `diagnose-mapserver.ps1` | Kiểm tra và chẩn đoán | Khi gặp lỗi, muốn biết nguyên nhân |
| `test-mapserver.ps1` | Test endpoints | Sau khi fix, verify hoạt động |
| `setup-mapserver.ps1` | Setup cơ bản | Lần đầu cài đặt |

### Cách dùng:

```powershell
# Full fix với auto-restart
.\fix-mapserver-complete.ps1 -AutoRestart

# Fix với custom path
.\fix-mapserver-complete.ps1 -ProjectPath "D:\MyProject" -AutoRestart

# Chỉ chẩn đoán
.\diagnose-mapserver.ps1

# Chỉ test
.\test-mapserver.ps1
```

---

## 💡 TIPS & BEST PRACTICES

### 1. Sau mỗi lần update code:
```powershell
cd C:\DuBaoMatRung
git pull
cd microservices\services\mapserver-service
npm install
pm2 restart mapserver-service
```

### 2. Backup trước khi thay đổi:
```powershell
# Backup .env
copy .env .env.backup

# Backup MapFile
copy mapserver\mapfiles\laocai.map mapserver\mapfiles\laocai.map.backup
```

### 3. Monitor service:
```powershell
# Real-time logs
pm2 logs mapserver-service

# Monitor dashboard
pm2 monit
```

### 4. Tự động restart khi Windows reboot:
```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

---

## 🎉 DONE!

Nếu tất cả các test đều pass, MapServer của bạn đã hoạt động tốt!

**Verify final:**
1. Mở browser: `http://103.56.160.66/`
2. Login vào hệ thống
3. Vào trang GIS/Map
4. Kiểm tra bản đồ hiển thị đúng

**No more 500 errors! 🎊**

---

**Created by: LuckyBoiz**
**Last updated: 2025-11-14**

---

### 📚 Related Docs

- [WINDOWS_DEPLOYMENT.md](./WINDOWS_DEPLOYMENT.md) - Full deployment guide
- [MAPSERVER_WINDOWS_FIX.md](./MAPSERVER_WINDOWS_FIX.md) - Detailed technical fix
- [QUICK_FIX_MAPSERVER.md](./QUICK_FIX_MAPSERVER.md) - Alternative quick fix

---

**Need help?**
Check logs: `pm2 logs mapserver-service`
Run diagnostic: `.\diagnose-mapserver.ps1`
