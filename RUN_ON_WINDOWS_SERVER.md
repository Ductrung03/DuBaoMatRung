# 🖥️ HƯỚNG DẪN CHẠY TRÊN WINDOWS SERVER

> **Cho LuckyBoiz** - Hướng dẫn chi tiết để chạy scripts fix MapServer trên Windows Server

---

## 📍 BẠN ĐANG Ở ĐÂU?

Bạn đang trên Windows Server tại: `103.56.160.66`

Project location: `C:\DuBaoMatRung` (hoặc đường dẫn khác)

---

## 🚀 BƯỚC 1: Mở PowerShell

### Cách 1: Qua Start Menu
1. Click **Start** (Windows logo)
2. Gõ: `PowerShell`
3. **Right-click** → **Run as Administrator**

### Cách 2: Qua Run Dialog
1. Press `Win + R`
2. Gõ: `powershell`
3. Press `Ctrl + Shift + Enter` (để chạy as Admin)

### Cách 3: Qua File Explorer
1. Mở `C:\DuBaoMatRung\scripts\windows`
2. `Shift + Right-click` vào folder
3. Chọn **"Open PowerShell window here as Administrator"**

---

## 🔧 BƯỚC 2: Navigate đến Scripts Folder

```powershell
# Đi đến thư mục scripts
cd C:\DuBaoMatRung\scripts\windows

# Hoặc nếu project ở chỗ khác:
cd D:\YourProjectPath\scripts\windows

# Kiểm tra files
dir
```

**Bạn sẽ thấy:**
```
fix-mapserver-complete.ps1
diagnose-mapserver.ps1
test-mapserver.ps1
setup-mapserver.ps1
README.md
```

---

## ⚡ BƯỚC 3: Chạy Script Fix

### Option A: Fix Nhanh (Khuyên dùng)

```powershell
.\fix-mapserver-complete.ps1 -AutoRestart
```

**Giải thích:**
- `.` = current directory
- `\` = path separator
- `-AutoRestart` = tự động restart service sau khi fix

### Option B: Fix với Custom Path

Nếu project không ở `C:\DuBaoMatRung`:

```powershell
.\fix-mapserver-complete.ps1 -ProjectPath "D:\YourPath\DuBaoMatRung" -AutoRestart
```

### Option C: Fix với PostgreSQL Test

```powershell
.\fix-mapserver-complete.ps1 -PostgresPassword "your_postgres_password" -AutoRestart
```

---

## ❗ Nếu Gặp Lỗi "Execution Policy"

### Lỗi này:
```
.\fix-mapserver-complete.ps1 : File cannot be loaded because running scripts is disabled on this system.
```

### Giải pháp:

#### Option 1: Change Execution Policy (Khuyên dùng)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Sau đó chạy lại script.

#### Option 2: Bypass cho một lần
```powershell
powershell -ExecutionPolicy Bypass -File .\fix-mapserver-complete.ps1 -AutoRestart
```

#### Option 3: Unblock file
```powershell
Unblock-File .\fix-mapserver-complete.ps1
.\fix-mapserver-complete.ps1 -AutoRestart
```

---

## 🔍 BƯỚC 4: Chạy Diagnostic (Nếu vẫn lỗi)

```powershell
.\diagnose-mapserver.ps1
```

**Script này sẽ:**
- ✅ Kiểm tra tất cả components
- ✅ Hiển thị lỗi và warnings
- ✅ Đưa ra recommendations
- ✅ Không thay đổi gì cả (safe)

### Lưu Report ra file:

```powershell
.\diagnose-mapserver.ps1 | Out-File diagnostic-report.txt
notepad diagnostic-report.txt
```

---

## 🧪 BƯỚC 5: Test Service

```powershell
.\test-mapserver.ps1
```

**Script này sẽ test:**
1. Health endpoint
2. WMS GetCapabilities
3. Gateway proxy
4. Sample GetMap request

---

## 📊 Đọc Kết Quả

### ✅ Thành Công

Bạn sẽ thấy:
```
╔══════════════════════════════════════════════════════════════╗
║                    SETUP SUMMARY                            ║
╚══════════════════════════════════════════════════════════════╝

✓ MS4W Installation: OK
✓ Directories Created: OK
✓ .env Configuration: OK

🎉 Setup complete! Good luck, LuckyBoiz!
```

### ❌ Thất Bại

Bạn sẽ thấy:
```
[ERROR] MS4W not found at: C:\ms4w\Apache\cgi-bin\mapserv.exe

Please install MS4W first:
1. Download from: https://ms4w.com/download.html
2. Extract to C:\ms4w\
3. Run this script again
```

**→ Làm theo hướng dẫn hiển thị!**

---

## 🛠️ COMMON TASKS

### 1. Restart Service

```powershell
pm2 restart mapserver-service
```

### 2. View Logs

```powershell
# Real-time logs
pm2 logs mapserver-service

# Last 50 lines
pm2 logs mapserver-service --lines 50

# Only errors
pm2 logs mapserver-service --err
```

### 3. Check Status

```powershell
pm2 status
```

### 4. Stop Service

```powershell
pm2 stop mapserver-service
```

### 5. Start Service

```powershell
pm2 start mapserver-service
# Or with ecosystem file:
pm2 start C:\DuBaoMatRung\ecosystem.config.js --only mapserver-service
```

### 6. Restart All Services

```powershell
pm2 restart all
```

---

## 🌐 KIỂM TRA TRÊN BROWSER

### Test Local (trên server)

Mở browser trên server:

```
http://localhost:3008/health
http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
```

### Test Via Gateway

```
http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
```

### Test Public (từ máy khác)

```
http://103.56.160.66/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
```

**Kết quả mong đợi:** XML file chứa `<WMS_Capabilities>`

---

## 🎯 TROUBLESHOOTING QUICK GUIDE

### Vấn đề: Service không start

```powershell
# 1. Check logs
pm2 logs mapserver-service --lines 100

# 2. Check config
notepad C:\DuBaoMatRung\microservices\services\mapserver-service\.env

# 3. Re-run fix
.\fix-mapserver-complete.ps1 -AutoRestart
```

### Vấn đề: Lỗi 500 vẫn còn

```powershell
# 1. Diagnostic
.\diagnose-mapserver.ps1

# 2. Check MS4W
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# 3. Check MapFile
Test-Path "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"

# 4. Restart all
pm2 restart all
```

### Vấn đề: Database connection error

```powershell
# 1. Check PostgreSQL running
net start postgresql*

# 2. Test connection
psql -U postgres -d admin_db -c "SELECT version();"

# 3. Check MapFile connection string
notepad C:\DuBaoMatRung\mapserver\mapfiles\laocai.map
# Find line with: CONNECTION "host=localhost..."
```

### Vấn đề: Port already in use

```powershell
# Check what's using port 3008
netstat -ano | findstr :3008

# Kill process if needed
taskkill /PID <PID_NUMBER> /F
```

---

## 📁 FILE LOCATIONS

### Important Files:

```
C:\DuBaoMatRung\
├── scripts\windows\
│   ├── fix-mapserver-complete.ps1      ← Main fix script
│   ├── diagnose-mapserver.ps1          ← Diagnostic script
│   ├── test-mapserver.ps1              ← Test script
│   └── README.md
│
├── microservices\services\mapserver-service\
│   ├── .env                            ← Configuration
│   ├── src\index.js                    ← Service code
│   └── package.json
│
├── mapserver\
│   ├── mapfiles\laocai.map             ← MapFile
│   └── tmp\                            ← Temp directory
│
└── ecosystem.config.js                  ← PM2 config
```

### MS4W Location:

```
C:\ms4w\
└── Apache\cgi-bin\mapserv.exe          ← MapServer binary
```

---

## 🎓 ADVANCED

### Run Multiple Commands

```powershell
# Chạy tuần tự
.\diagnose-mapserver.ps1
.\fix-mapserver-complete.ps1 -AutoRestart
.\test-mapserver.ps1

# Or one-liner
.\diagnose-mapserver.ps1; .\fix-mapserver-complete.ps1 -AutoRestart; .\test-mapserver.ps1
```

### Schedule Automatic Health Check

Tạo file `health-check.ps1`:

```powershell
cd C:\DuBaoMatRung\scripts\windows
$result = .\test-mapserver.ps1
if ($LASTEXITCODE -ne 0) {
    .\fix-mapserver-complete.ps1 -AutoRestart
    # Send email alert (optional)
}
```

Sau đó setup Windows Task Scheduler để chạy mỗi giờ.

---

## 📞 NEED HELP?

### Quick Debug Commands:

```powershell
# 1. Check project exists
Test-Path "C:\DuBaoMatRung"

# 2. Check MS4W exists
Test-Path "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# 3. Check service running
pm2 status

# 4. Check port open
netstat -ano | findstr :3008

# 5. Check PostgreSQL
net start postgresql*

# 6. View all errors
pm2 logs mapserver-service --err --lines 50
```

### Full Diagnostic Report:

```powershell
cd C:\DuBaoMatRung\scripts\windows
.\diagnose-mapserver.ps1 | Out-File C:\diagnostic-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt
```

---

## 🎉 SUCCESS CHECKLIST

Sau khi chạy scripts, verify:

- [ ] Script chạy không lỗi
- [ ] PM2 status shows "online"
- [ ] `curl http://localhost:3008/health` returns OK
- [ ] Browser không còn lỗi 500
- [ ] Bản đồ hiển thị đúng trên frontend

**Nếu tất cả ✅ → YOU'RE DONE! 🎊**

---

## 💡 TIPS

### Tip 1: Copy Commands
Bạn có thể copy commands từ file này và paste vào PowerShell:
- Select command → `Ctrl+C`
- Click vào PowerShell window → `Right-click` (tự động paste)

### Tip 2: Tab Completion
Trong PowerShell, gõ vài ký tự đầu rồi press `Tab` để auto-complete:
```powershell
cd C:\Du<TAB>          # → C:\DuBaoMatRung\
.\fix<TAB>             # → .\fix-mapserver-complete.ps1
```

### Tip 3: Command History
- Press `↑` (up arrow) để xem lệnh trước
- Press `F7` để xem lịch sử commands

### Tip 4: Clear Screen
```powershell
cls
# or
Clear-Host
```

---

## 📚 REFERENCE

### PowerShell Basics:

| Command | Description |
|---------|-------------|
| `cd <path>` | Change directory |
| `dir` or `ls` | List files |
| `pwd` or `Get-Location` | Show current directory |
| `cls` | Clear screen |
| `exit` | Close PowerShell |

### PM2 Commands:

| Command | Description |
|---------|-------------|
| `pm2 status` | Show all processes |
| `pm2 logs <name>` | View logs |
| `pm2 restart <name>` | Restart process |
| `pm2 stop <name>` | Stop process |
| `pm2 start <name>` | Start process |
| `pm2 monit` | Monitor dashboard |

---

## 🔗 RELATED DOCS

- [FIX_MAPSERVER_NOW.md](./FIX_MAPSERVER_NOW.md) - Quick reference
- [scripts/windows/README.md](./scripts/windows/README.md) - Scripts documentation
- [WINDOWS_DEPLOYMENT.md](./WINDOWS_DEPLOYMENT.md) - Full deployment guide

---

**Created for: LuckyBoiz**
**Server: 103.56.160.66**
**Last updated: 2025-11-14**

---

## ✨ QUICK COPY-PASTE

### Full Fix (Copy all at once):

```powershell
cd C:\DuBaoMatRung\scripts\windows
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\fix-mapserver-complete.ps1 -AutoRestart
.\test-mapserver.ps1
pm2 status
```

### Just Restart Service:

```powershell
pm2 restart mapserver-service
pm2 logs mapserver-service --lines 20
```

### Full Diagnostic:

```powershell
cd C:\DuBaoMatRung\scripts\windows
.\diagnose-mapserver.ps1 | Out-File report.txt
notepad report.txt
```

---

**Happy Fixing! 🚀**
