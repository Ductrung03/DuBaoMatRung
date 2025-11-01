# 🐳 Docker Deployment Guide

## Why Docker?

✅ **1 lệnh deploy** - Không cần cài PostgreSQL, MongoDB, Redis
✅ **Tự động setup DB** - Databases tự tạo và config
✅ **Dễ update** - Chỉ cần pull code và restart
✅ **Giống production** - Dev và production giống nhau 100%

---

## 📋 Prerequisites

### Install Docker Desktop

Download and install:
- **Windows**: https://www.docker.com/products/docker-desktop

After installation:
1. Start Docker Desktop
2. Wait until Docker icon shows "Docker Desktop is running"

---

## 🚀 Quick Start (First Time)

### Step 1: Clone code (if not done)

```powershell
cd C:\
git clone https://github.com/yourusername/DuBaoMatRung.git
cd C:\DuBaoMatRung
```

### Step 2: Setup environment

```powershell
# Copy .env template
Copy-Item .env.docker .env

# Edit .env file
notepad .env
```

Change these values:
```env
DB_PASSWORD=your_secure_password_here  # ← Change this
JWT_SECRET=your_jwt_secret_here        # ← Change this
SERVER_IP=103.56.161.239               # ← Your server IP
```

### Step 3: Deploy!

```powershell
.\deploy-docker.ps1 -FirstTime
```

That's it! Docker will:
1. ✅ Build all services
2. ✅ Create databases (PostgreSQL, PostGIS, MongoDB, Redis)
3. ✅ Start all containers
4. ✅ Setup networking

**Wait time**: ~5-10 minutes (first time only)

### Step 4: Access your application

- **Frontend**: http://103.56.161.239:5173
- **API Gateway**: http://103.56.161.239:3000
- **Swagger Docs**: http://103.56.161.239:3000/api-docs

---

## 🔄 Update Code Later

When you have new code:

```powershell
cd C:\DuBaoMatRung
.\deploy-docker.ps1
```

This will:
1. Pull latest code from Git
2. Rebuild changed services
3. Restart containers

**Wait time**: ~2-5 minutes

---

## 🛠️ Docker Commands

### View logs (all services)
```powershell
docker-compose logs -f
```

### View logs (specific service)
```powershell
docker-compose logs -f gateway
docker-compose logs -f auth-service
```

### View running containers
```powershell
docker-compose ps
```

### Stop all services
```powershell
.\deploy-docker.ps1 -Stop
# OR
docker-compose down
```

### Restart a service
```powershell
docker-compose restart gateway
```

### Rebuild everything from scratch
```powershell
.\deploy-docker.ps1 -Rebuild
```

### Remove all data (WARNING: deletes databases!)
```powershell
docker-compose down -v
```

---

## 🔍 Troubleshooting

### Problem: Port already in use

**Error**: `bind: address already in use`

**Solution**:
```powershell
# Stop the conflicting service
docker-compose down

# Or find and kill the process
netstat -ano | findstr "3000"  # Replace 3000 with your port
taskkill /PID <PID> /F
```

### Problem: Database not ready

**Error**: Service keeps restarting

**Solution**:
```powershell
# View logs to see what's wrong
docker-compose logs -f postgres
docker-compose logs -f mongodb

# Restart databases
docker-compose restart postgres mongodb redis
```

### Problem: Out of disk space

**Solution**:
```powershell
# Clean up unused images and containers
docker system prune -a

# Clean up volumes (WARNING: deletes data!)
docker volume prune
```

### Problem: Build failed

**Solution**:
```powershell
# Rebuild with no cache
.\deploy-docker.ps1 -Rebuild
```

---

## 📊 What's Running?

After deployment, you'll have:

### Databases (Auto-created)
- **PostgreSQL** (port 5432) - Auth data
- **PostGIS** (port 5433) - GIS data with spatial extensions
- **MongoDB** (port 27017) - Logging data
- **Redis** (port 6379) - GIS cache

### Microservices
- **Gateway** (port 3000) - API Gateway + Swagger
- **Auth Service** (port 3001) - Authentication
- **User Service** (port 3002) - User management
- **GIS Service** (port 3003) - GIS operations
- **Report Service** (port 3004) - Reports
- **Admin Service** (port 3005) - Admin functions
- **Search Service** (port 3006) - Search functionality
- **MapServer** (port 3007) - Map rendering

### Frontend
- **Client** (port 5173) - React application

---

## 🎯 Advantages Over PM2

| Feature | Docker | PM2 |
|---------|--------|-----|
| **Setup databases** | Automatic | Manual install |
| **Dependencies** | Isolated per service | Can conflict |
| **Portability** | Works anywhere | Platform-specific |
| **Rollback** | Easy (image tags) | Manual |
| **Scaling** | Built-in | Complex |
| **Learning curve** | Medium | Easy |

---

## 📝 File Structure

```
C:\DuBaoMatRung\
├── docker-compose.yml        # Main Docker config
├── .env                       # Environment variables
├── deploy-docker.ps1          # Deployment script
├── microservices/
│   ├── gateway/
│   │   └── Dockerfile
│   └── services/
│       ├── auth-service/
│       │   └── Dockerfile
│       └── ...
└── client/
    ├── Dockerfile
    └── nginx.conf
```

---

## 🆘 Need Help?

1. **View all logs**: `docker-compose logs -f`
2. **Check service health**: `docker-compose ps`
3. **Restart everything**: `docker-compose restart`
4. **Start fresh**: `docker-compose down && .\deploy-docker.ps1 -FirstTime`

---

## ⚡ Quick Reference

```powershell
# First time deploy
.\deploy-docker.ps1 -FirstTime

# Update code
.\deploy-docker.ps1

# Rebuild everything
.\deploy-docker.ps1 -Rebuild

# Stop all
.\deploy-docker.ps1 -Stop

# View logs
docker-compose logs -f [service-name]

# Check status
docker-compose ps
```

---

## 🎉 Done!

Your application is now running in Docker containers!
All databases are auto-created and configured.
No manual setup required! 🚀
