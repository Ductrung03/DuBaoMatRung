# 🚀 Quick Start - Deploy to Windows Server

**Triển khai DuBaoMatRung trong 5 phút!**

## ⚡ TL;DR - Nhanh Nhất

### Trên Development Machine (Linux)
```bash
# Export data
./docker/export-current-data.sh

# Đóng gói
cd ..
tar -czf DuBaoMatRung.tar.gz DuBaoMatRung/

# Transfer sang Windows: 103.56.160.66
```

### Trên Windows Server
```powershell
# Giải nén
tar -xzf DuBaoMatRung.tar.gz
cd DuBaoMatRung

# Cấu hình
Copy-Item env.docker.example .env
notepad .env  # Sửa DB_PASSWORD, JWT_SECRET

# Deploy!
.\deploy-windows.ps1
```

**Done!** → http://103.56.160.66

---

## 📝 Chi Tiết 5 Bước

### 1️⃣ Export Data (Linux - 1 phút)
```bash
cd /home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung
./docker/export-current-data.sh
```
**Output**: `docker/initial-data/` với 3 files SQL

### 2️⃣ Đóng Gói Project (1 phút)
```bash
cd ..
tar -czf DuBaoMatRung.tar.gz \
  --exclude=DuBaoMatRung/node_modules \
  --exclude=DuBaoMatRung/*/node_modules \
  --exclude=DuBaoMatRung/*/*/node_modules \
  --exclude=DuBaoMatRung/microservices/services/*/logs \
  DuBaoMatRung/
```
**Output**: File `DuBaoMatRung.tar.gz` (~300MB)

### 3️⃣ Transfer Sang Windows (2-5 phút)
```bash
# Option A: SCP
scp DuBaoMatRung.tar.gz administrator@103.56.160.66:C:/Deploy/

# Option B: RDP + Copy/Paste
# Option C: Google Drive/OneDrive
```

### 4️⃣ Setup Environment (Windows - 1 phút)
```powershell
cd C:\Deploy\DuBaoMatRung

# Tạo .env
Copy-Item env.docker.example .env

# Generate random JWT secrets
$jwt1 = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$jwt2 = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

Write-Host "JWT_SECRET=$jwt1"
Write-Host "REFRESH_TOKEN_SECRET=$jwt2"

# Mở và paste vào .env
notepad .env
```

**Sửa trong .env:**
```bash
DB_PASSWORD=YourStrongPassword123!
JWT_SECRET=<paste-jwt1>
REFRESH_TOKEN_SECRET=<paste-jwt2>
SERVER_IP=103.56.160.66
```

### 5️⃣ Deploy! (15-20 phút first time)
```powershell
.\deploy-windows.ps1
```

**Script sẽ tự động:**
- ✅ Check Docker
- ✅ Build 9 images (Gateway, Auth, User, GIS, Report, Admin, Search, MapServer, Frontend)
- ✅ Start PostgreSQL 17 + Redis
- ✅ Import data từ `docker/initial-data/`
- ✅ Start all services
- ✅ Health check

---

## 🎯 Verification

### Check Status
```powershell
docker compose ps
```
**Expected**: 9 containers running (all "Up")

### Test Frontend
```powershell
Start-Process http://103.56.160.66
```

### Test API
```powershell
curl http://103.56.160.66:3000/health
# Should return: {"status":"ok"}
```

### View Logs
```powershell
docker compose logs -f gateway
```

---

## 🔄 Update Code (Lần Sau)

```powershell
# Transfer code mới
cd C:\Deploy\DuBaoMatRung

# Quick restart
.\deploy-windows.ps1 -SkipBuild

# Full rebuild
.\deploy-windows.ps1
```

---

## 🐛 Common Issues

### Port Already in Use
```powershell
# Check what's using port 3000
netstat -ano | findstr "3000"

# Kill process
taskkill /PID <PID> /F
```

### Database Import Failed
```powershell
# Manual import
.\docker\import-initial-data.ps1
```

### Service Won't Start
```powershell
# Check logs
docker compose logs <service-name>

# Restart
docker compose restart <service-name>
```

---

## 📞 Need Help?

**Check logs:**
```powershell
docker compose logs > debug.log
```

**Full docs:** [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

---

**That's it! Enjoy! 🎉**
