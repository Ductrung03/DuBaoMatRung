# Windows PowerShell Scripts cho MapServer

Bộ scripts tự động để setup, fix, và chẩn đoán MapServer trên Windows Server.

## 📑 Danh Sách Scripts

### 1. `fix-mapserver-complete.ps1` ⭐ (Khuyên dùng)
**Mục đích:** Tự động fix toàn bộ cấu hình MapServer

**Cách dùng:**
```powershell
# Chạy với auto-restart
.\fix-mapserver-complete.ps1 -AutoRestart

# Custom project path
.\fix-mapserver-complete.ps1 -ProjectPath "D:\DuBaoMatRung" -AutoRestart

# Với PostgreSQL password (để test connection)
.\fix-mapserver-complete.ps1 -PostgresPassword "your_password" -AutoRestart
```

**Chức năng:**
- ✅ Kiểm tra MS4W installation
- ✅ Tạo thư mục cần thiết
- ✅ Tạo file .env với cấu hình đúng
- ✅ Kiểm tra PostgreSQL
- ✅ Validate MapFile
- ✅ Kiểm tra dependencies
- ✅ Setup PM2
- ✅ Test connectivity
- ✅ Auto restart service (nếu -AutoRestart)

---

### 2. `diagnose-mapserver.ps1` 🔍
**Mục đích:** Chẩn đoán và phát hiện vấn đề

**Cách dùng:**
```powershell
# Chạy diagnostic
.\diagnose-mapserver.ps1

# Save report to file
.\diagnose-mapserver.ps1 | Out-File diagnostic-report.txt

# Custom path
.\diagnose-mapserver.ps1 -ProjectPath "D:\DuBaoMatRung"
```

**Kiểm tra:**
- ✅ Project structure
- ✅ MS4W installation & executable
- ✅ Configuration files (.env, MapFile)
- ✅ Node.js environment
- ✅ PM2 process manager
- ✅ PostgreSQL database
- ✅ Network & ports
- ✅ Service health
- ✅ Recent error logs

**Output:**
- Critical issues (❌)
- Warnings (⚠️)
- Recommendations
- Quick fix commands

---

### 3. `test-mapserver.ps1` 🧪
**Mục đích:** Test các endpoints của MapServer

**Cách dùng:**
```powershell
.\test-mapserver.ps1
```

**Test cases:**
1. Health check endpoint
2. WMS GetCapabilities
3. Via API Gateway
4. WMS GetMap (sample)
5. PM2 status

**Output:**
- ✅ Pass
- ❌ Fail with error details

---

### 4. `setup-mapserver.ps1` 🛠️
**Mục đích:** Setup cơ bản MapServer (legacy)

**Cách dùng:**
```powershell
.\setup-mapserver.ps1
```

**Note:** Khuyên dùng `fix-mapserver-complete.ps1` thay vì script này.

---

## 🚀 Quick Start

### Lần đầu setup:

```powershell
# 1. Chạy setup/fix
.\fix-mapserver-complete.ps1 -AutoRestart

# 2. Verify với diagnostic
.\diagnose-mapserver.ps1

# 3. Test endpoints
.\test-mapserver.ps1
```

### Khi gặp lỗi:

```powershell
# 1. Chẩn đoán vấn đề
.\diagnose-mapserver.ps1

# 2. Fix tự động
.\fix-mapserver-complete.ps1 -AutoRestart

# 3. Test lại
.\test-mapserver.ps1
```

### Monitoring:

```powershell
# Xem logs
pm2 logs mapserver-service

# Monitor real-time
pm2 monit

# Check status
pm2 status
```

---

## 📋 Parameters

### `fix-mapserver-complete.ps1`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-ProjectPath` | String | `C:\DuBaoMatRung` | Đường dẫn project root |
| `-MS4WPath` | String | `C:\ms4w\Apache\cgi-bin\mapserv.exe` | Đường dẫn MapServer binary |
| `-PostgresPassword` | String | Empty | Password PostgreSQL để test connection |
| `-AutoRestart` | Switch | False | Tự động restart service sau khi config |

### `diagnose-mapserver.ps1`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-ProjectPath` | String | `C:\DuBaoMatRung` | Đường dẫn project root |
| `-MS4WPath` | String | `C:\ms4w\Apache\cgi-bin\mapserv.exe` | Đường dẫn MapServer binary |

---

## 🎯 Use Cases

### Case 1: Fresh Installation
```powershell
# Cài MS4W trước
# Download từ https://ms4w.com/

# Chạy full setup
.\fix-mapserver-complete.ps1 -AutoRestart

# Verify
.\test-mapserver.ps1
```

### Case 2: Lỗi 500 Internal Server Error
```powershell
# Chẩn đoán
.\diagnose-mapserver.ps1

# Fix
.\fix-mapserver-complete.ps1 -AutoRestart

# Test
.\test-mapserver.ps1
```

### Case 3: Sau khi update code
```powershell
# Pull code mới
cd C:\DuBaoMatRung
git pull

# Re-fix nếu có thay đổi config
.\scripts\windows\fix-mapserver-complete.ps1 -AutoRestart

# Test
.\scripts\windows\test-mapserver.ps1
```

### Case 4: Service restart liên tục
```powershell
# Chẩn đoán chi tiết
.\diagnose-mapserver.ps1 | Out-File report.txt

# Xem logs
pm2 logs mapserver-service --lines 100

# Fix và restart
.\fix-mapserver-complete.ps1 -AutoRestart
```

### Case 5: Migrate sang server mới
```powershell
# Trên server mới
# 1. Clone/Copy project
# 2. Cài MS4W
# 3. Cài Node.js, PM2
# 4. Chạy setup

.\fix-mapserver-complete.ps1 -ProjectPath "D:\NewPath" -AutoRestart
```

---

## ⚠️ Prerequisites

### Phần mềm cần cài trước:

1. **MS4W (MapServer for Windows)**
   - Download: https://ms4w.com/download.html
   - Extract to: `C:\ms4w\`

2. **Node.js**
   - Download: https://nodejs.org/
   - Version: 18.x hoặc 20.x

3. **PostgreSQL**
   - Download: https://www.postgresql.org/download/windows/
   - Version: 15.x
   - Với PostGIS extension

4. **PM2**
   ```powershell
   npm install -g pm2
   ```

### Permissions:

Scripts có thể cần quyền Administrator để:
- Tạo thư mục
- Set file permissions
- Start/Stop services

Chạy PowerShell as Administrator:
```powershell
# Right-click PowerShell > Run as Administrator
```

---

## 🐛 Troubleshooting

### Script không chạy (Execution Policy)

```powershell
# Kiểm tra policy
Get-ExecutionPolicy

# Nếu Restricted, thay đổi:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Hoặc bypass cho một lần:
powershell -ExecutionPolicy Bypass -File .\fix-mapserver-complete.ps1
```

### Lỗi: "File not found"

```powershell
# Kiểm tra đường dẫn
Get-Location

# Phải ở trong thư mục scripts/windows
cd C:\DuBaoMatRung\scripts\windows

# Hoặc dùng absolute path
C:\DuBaoMatRung\scripts\windows\fix-mapserver-complete.ps1
```

### Lỗi: "Access Denied"

```powershell
# Chạy PowerShell as Administrator
# Right-click > Run as Administrator
```

### Script chạy nhưng service vẫn lỗi

```powershell
# 1. Chạy diagnostic
.\diagnose-mapserver.ps1 | Out-File report.txt

# 2. Xem report
notepad report.txt

# 3. Check logs
pm2 logs mapserver-service --lines 50

# 4. Manual check
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"
Test-Path "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"
Get-Content "C:\DuBaoMatRung\microservices\services\mapserver-service\.env"
```

---

## 📊 Expected Output

### ✅ Successful Run

```
╔══════════════════════════════════════════════════════════════╗
║  MAPSERVER COMPLETE FIX SCRIPT FOR WINDOWS                  ║
║  Dự Báo Mất Rừng - LuckyBoiz Edition                       ║
╚══════════════════════════════════════════════════════════════╝

[STEP 0] Validating project path...
   [OK] Project path: C:\DuBaoMatRung

[STEP 1] Checking MS4W installation...
   [OK] MS4W found: C:\ms4w\Apache\cgi-bin\mapserv.exe
   [OK] MapServer binary is executable

[STEP 2] Creating required directories...
   [OK] C:\DuBaoMatRung\mapserver\mapfiles
   [OK] C:\DuBaoMatRung\mapserver\tmp
   ...

[STEP 3] Creating MapServer service .env file...
   [OK] Created: C:\DuBaoMatRung\microservices\services\mapserver-service\.env

...

╔══════════════════════════════════════════════════════════════╗
║                    SETUP SUMMARY                            ║
╚══════════════════════════════════════════════════════════════╝

✓ MS4W Installation: OK
✓ Directories Created: OK
✓ .env Configuration: OK

🎉 Setup complete! Good luck, LuckyBoiz!
```

---

## 🔗 Related Documentation

- [FIX_MAPSERVER_NOW.md](../../FIX_MAPSERVER_NOW.md) - Quick reference guide
- [WINDOWS_DEPLOYMENT.md](../../WINDOWS_DEPLOYMENT.md) - Full deployment guide
- [MAPSERVER_WINDOWS_FIX.md](../../MAPSERVER_WINDOWS_FIX.md) - Technical details

---

## 📝 Notes

### Script Design Philosophy:

1. **Idempotent**: Chạy nhiều lần không gây hại
2. **Verbose**: Output chi tiết để debug
3. **Safe**: Backup trước khi thay đổi
4. **Smart**: Tự động detect và fix
5. **Helpful**: Gợi ý next steps

### Best Practices:

- ✅ Chạy diagnostic trước khi fix
- ✅ Backup .env trước khi overwrite
- ✅ Check logs sau mỗi restart
- ✅ Test endpoints sau khi fix
- ✅ Save diagnostic reports

### Security:

- ⚠️ Không commit `.env` vào Git
- ⚠️ Không share PostgreSQL passwords
- ⚠️ Set proper file permissions
- ⚠️ Use strong JWT secrets

---

## 🎓 Advanced Usage

### Custom MS4W Location:

```powershell
.\fix-mapserver-complete.ps1 `
  -MS4WPath "D:\MapServer\ms4w\Apache\cgi-bin\mapserv.exe" `
  -AutoRestart
```

### Multiple Environments:

```powershell
# Development
.\fix-mapserver-complete.ps1 -ProjectPath "C:\Dev\DuBaoMatRung"

# Staging
.\fix-mapserver-complete.ps1 -ProjectPath "D:\Staging\DuBaoMatRung"

# Production
.\fix-mapserver-complete.ps1 -ProjectPath "E:\Production\DuBaoMatRung" -AutoRestart
```

### Automated Deployment:

```powershell
# deploy.ps1
git pull
.\scripts\windows\fix-mapserver-complete.ps1 -AutoRestart
.\scripts\windows\test-mapserver.ps1
```

---

## 💬 Support

Nếu scripts không hoạt động:

1. **Run diagnostic:**
   ```powershell
   .\diagnose-mapserver.ps1 | Out-File report.txt
   ```

2. **Check logs:**
   ```powershell
   pm2 logs mapserver-service --lines 100
   ```

3. **Manual verification:**
   ```powershell
   # Check all components
   Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"
   Test-Path "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"
   Get-Service *postgresql*
   pm2 status
   ```

4. **GitHub Issues:**
   Create issue with diagnostic report attached

---

**Created by: LuckyBoiz**
**Last updated: 2025-11-14**
**Version: 1.0.0**
