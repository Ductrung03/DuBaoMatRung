# 🌲 Du Bao Mat Rung - Forest Monitoring & Prediction System

Hệ thống phát hiện sớm và dự báo mất rừng sử dụng GIS, AI và microservices architecture.

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

---

## 🚀 Quick Start

> **👉 NGƯỜI MỚI:** Đọc [START_HERE.md](START_HERE.md) để biết nên đọc tài liệu nào trước!

### Windows Server Deployment (3 Steps)

```powershell
# 1. Setup environment
cd C:\DuBaoMatRung
copy .env.example .env
notepad .env  # Edit: DB_PASSWORD, JWT_SECRET, VITE_API_URL

# 2. Deploy (10-20 minutes, auto-import database)
.\deploy.ps1 -FirstTime

# 3. Access
# Frontend: http://localhost:5173
# API: http://localhost:3000
```

**✅ Done!** Database auto-imports from `docker-init/` folder.

📖 **Documentation**:
- 🎯 [START_HERE.md](START_HERE.md) - Đọc đầu tiên để biết thứ tự đọc tài liệu
- ⚡ [QUICKSTART.md](QUICKSTART.md) - Quick start 3 bước
- 📚 [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide

---

## 📁 Project Structure

```
DuBaoMatRung/
├── client/                     # React Frontend (Vite + TailwindCSS)
├── microservices/              # Backend Microservices
│   ├── gateway/               # API Gateway (Port 3000)
│   └── services/
│       ├── auth-service/      # Authentication & Authorization
│       ├── user-service/      # User Management
│       ├── gis-service/       # GIS & Spatial Operations
│       ├── report-service/    # Report Generation
│       ├── admin-service/     # Admin Functions
│       ├── search-service/    # Search & Filter
│       └── mapserver-service/ # MapServer Integration
├── docker-init/               # Database Dumps (Auto-import)
│   ├── postgres/              # Auth DB (~31KB)
│   ├── postgis/               # GIS DB (~12MB)
│   └── admin-postgis/         # Admin DB (~2.5GB)
├── docker-compose.yml         # Docker Configuration
├── deploy.ps1                 # Main Deployment Script
├── update.ps1                 # Quick Update Script
├── DEPLOYMENT.md              # Full Documentation
└── QUICKSTART.md              # Quick Start Guide
```

---

## 🛠️ Tech Stack

### Backend
- **Node.js 20** + Express
- **PostgreSQL 15** - Authentication & Users
- **PostGIS 15** - GIS data with spatial extensions
- **MongoDB 7** - Logging & Analytics
- **Redis 7** - Caching
- **JWT** - Authentication
- **Prisma** - ORM (optional)

### Frontend
- **React 19** - UI Framework
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **Leaflet** - Interactive Maps
- **Axios** - HTTP Client
- **React Router** - Navigation

### Infrastructure
- **Docker** + Docker Compose
- **Nginx** - Reverse Proxy & Static Serving
- **GitHub Actions** - CI/CD (optional)

---

## 🔄 Update Code

After modifying code on server:

```powershell
# Auto-detect changes (Fast!)
.\update.ps1 -AutoDetect

# Or update specific services
.\update.ps1 -Services client,auth-service

# Or rebuild all
.\deploy.ps1 -Rebuild
```

**Smart Update**: Auto-detects changed files and only rebuilds affected services (5-10x faster!)

---

## 📊 Services & Ports

| Service | Port | Public | Description |
|---------|------|--------|-------------|
| **Client** | 5173 | ✅ | React Frontend |
| **Gateway** | 3000 | ✅ | API Gateway |
| Auth Service | 3001 | ❌ | Authentication |
| User Service | 3002 | ❌ | User Management |
| GIS Service | 3003 | ❌ | GIS Operations |
| Report Service | 3004 | ❌ | Reports |
| Admin Service | 3005 | ❌ | Admin |
| Search Service | 3006 | ❌ | Search |
| MapServer | 3007 | ❌ | Maps |
| PostgreSQL | 5432 | ❌ | Auth DB |
| PostGIS | 5433 | ❌ | GIS DB |
| Admin PostGIS | 5434 | ❌ | Admin DB |
| MongoDB | 27017 | ❌ | Logging |
| Redis | 6379 | ❌ | Cache |

**Public** = Should expose to internet. Only expose ports 3000 & 5173.

---

## 🔧 Common Commands

```powershell
# Deployment
.\deploy.ps1 -FirstTime      # First time setup
.\deploy.ps1                 # Start services
.\deploy.ps1 -Stop           # Stop all
.\deploy.ps1 -Restart        # Restart all
.\deploy.ps1 -Rebuild        # Rebuild all

# Update Code
.\update.ps1 -AutoDetect     # Smart update
.\update.ps1 -Services client # Update specific service

# Logs & Debug
.\deploy.ps1 -Logs           # All logs
.\deploy.ps1 -Logs -Service auth-service
docker-compose ps            # Status
docker stats                 # Resource usage

# Database
docker exec -it dubaomatrung-postgres psql -U postgres auth_db
docker exec dubaomatrung-postgres pg_dump -U postgres auth_db > backup.sql

# Cleanup
.\deploy.ps1 -CleanAll       # Remove everything (DANGEROUS!)
docker system prune -a       # Clean Docker cache
```

---

## 🎯 Features

### Authentication & Authorization
- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Data scope management (national, province, district, commune)

### GIS Operations
- ✅ Shapefile upload & processing
- ✅ Spatial queries (PostGIS)
- ✅ Layer management
- ✅ Map visualization (Leaflet)
- ✅ Data verification workflow

### Reporting
- ✅ Custom report generation
- ✅ Export to multiple formats
- ✅ Statistical analysis
- ✅ Data visualization

### Admin
- ✅ User management
- ✅ Role & permission management
- ✅ System logs & audit trail
- ✅ Database backup & restore

---

## 🔐 Security

### Production Checklist

- [ ] Change `DB_PASSWORD` to strong password (16+ chars)
- [ ] Generate random `JWT_SECRET` (32+ chars)
- [ ] Update `VITE_API_URL` to production domain/IP
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure firewall (only allow ports 3000, 5173)
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up regular database backups
- [ ] Review and update CORS origins
- [ ] Enable rate limiting on gateway
- [ ] Set up monitoring & alerting

### Generate Secure Keys

```powershell
# JWT Secret (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Database Password
-join ((33..126) | Get-Random -Count 20 | % {[char]$_})
```

---

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick start in 3 steps
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment guide
- **[CHANGES.md](CHANGES.md)** - What changed in this version
- **[docker-init/README.md](docker-init/README.md)** - Database initialization
- **[.env.example](.env.example)** - Environment variables template

---

## 🐛 Troubleshooting

### Container won't start?
```powershell
.\deploy.ps1 -Logs -Service <service-name>
.\deploy.ps1 -Restart -Service <service-name>
```

### Database not importing?
```powershell
# Database already exists? PostgreSQL skips auto-import.
# Delete volumes to re-import:
docker-compose down -v
.\deploy.ps1 -FirstTime
```

### Port conflicts?
```powershell
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Code changes not applying?
```powershell
.\deploy.ps1 -Rebuild -Service <service-name>
```

### Full reset?
```powershell
docker-compose down -v
.\deploy.ps1 -FirstTime
```

More troubleshooting: [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)

---

## 🎓 Development Workflow

### Local Development
```bash
# Backend service
cd microservices/services/auth-service
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

### Deploy to Production
```powershell
# 1. Develop on local machine
git commit -m "Add feature X"
git push origin main

# 2. Update on server
cd C:\DuBaoMatRung
git pull origin main
.\update.ps1 -AutoDetect

# 3. Verify
.\deploy.ps1 -Logs
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

**LuckyBoiz Development Team**

For questions or support, please open an issue on GitHub.

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

---

**Version**: 2.0
**Last Updated**: 2025-01-02
**Status**: Production Ready 🚀
