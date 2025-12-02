# 🐳 Docker Deployment - DuBaoMatRung

**Complete Docker setup for Windows Server deployment.**

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Deploy trong 5 phút ⚡
- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Hướng dẫn chi tiết 📖
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Checklist đầy đủ ✅

---

## 🎯 Overview

Docker setup này bao gồm:

### Services (9 containers)
1. **PostgreSQL 17** - Database chính (3 databases: auth_db, gis_db, admin_db)
2. **Redis 7** - Cache và session storage
3. **Gateway** - API Gateway (port 3000)
4. **Auth Service** - Authentication với Prisma (port 3001)
5. **User Service** - User management (port 3002)
6. **GIS Service** - GIS và shapefile processing (port 3003)
7. **Report Service** - Báo cáo (port 3004)
8. **Admin Service** - Admin functions (port 3005)
9. **Search Service** - Search functionality (port 3006)
10. **MapServer Service** - MapServer integration (port 3007)
11. **Frontend** - React app với Nginx (port 80)

### Features
✅ PostgreSQL 17 với PostGIS extension
✅ Redis caching layer
✅ Health checks cho tất cả services
✅ Automatic database migrations
✅ Log rotation và persistence
✅ Volume mounts cho data persistence
✅ Network isolation
✅ One-command deployment
✅ Automatic backup/restore scripts

---

## 🚀 Quick Start

### 1. Export Data (Development)
```bash
./docker/export-current-data.sh
```

### 2. Package Project
```bash
cd ..
tar -czf DuBaoMatRung.tar.gz DuBaoMatRung/
```

### 3. Deploy (Windows Server)
```powershell
# Extract
tar -xzf DuBaoMatRung.tar.gz
cd DuBaoMatRung

# Configure
Copy-Item env.docker.example .env
notepad .env

# Deploy!
.\deploy-windows.ps1
```

**→ http://103.56.160.66**

---

## 📁 File Structure

```
DuBaoMatRung/
├── docker-compose.yml              # Main compose file
├── Dockerfile.gateway              # Gateway image
├── Dockerfile.auth                 # Auth service image
├── Dockerfile.service              # Generic service image
├── Dockerfile.mapserver            # MapServer image
├── Dockerfile.frontend             # React frontend image
├── .dockerignore                   # Docker ignore rules
├── env.docker.example              # Environment template
│
├── deploy-windows.ps1              # 🎯 ONE-COMMAND DEPLOY
│
├── docker/
│   ├── nginx.conf                  # Frontend nginx config
│   ├── init-db.sql                 # Database initialization
│   ├── initial-data/               # 📦 Exported SQL dumps
│   │   ├── auth_db.sql
│   │   ├── gis_db.sql
│   │   └── admin_db.sql
│   │
│   ├── export-current-data.sh      # Export dev data
│   ├── import-initial-data.ps1     # Import to Docker
│   ├── backup-databases.sh         # Backup script (Linux)
│   ├── backup-databases.ps1        # Backup script (Windows)
│   ├── restore-databases.sh        # Restore script
│   └── docker-quick-commands.ps1   # Interactive menu
│
├── QUICKSTART.md                   # ⚡ 5-minute guide
├── DOCKER_DEPLOYMENT.md            # 📖 Full documentation
├── DEPLOYMENT_CHECKLIST.md         # ✅ Complete checklist
└── README.DOCKER.md                # This file
```

---

## 🛠️ Management Scripts

### Windows PowerShell

**Deploy:**
```powershell
.\deploy-windows.ps1              # Normal deploy
.\deploy-windows.ps1 -Fresh       # Fresh install (remove data)
.\deploy-windows.ps1 -SkipBuild   # Quick restart
```

**Interactive Menu:**
```powershell
.\docker\docker-quick-commands.ps1
```
Options:
- View status, logs
- Start/stop/restart services
- Backup databases
- Resource monitoring
- Database shell access
- And more...

**Backup:**
```powershell
.\docker\backup-databases.ps1
```

**Import Data:**
```powershell
.\docker\import-initial-data.ps1
```

### Linux Bash

**Export Data:**
```bash
./docker/export-current-data.sh
```

**Backup:**
```bash
./docker/backup-databases.sh
```

**Restore:**
```bash
./docker/restore-databases.sh ./backups/20250101_120000
```

---

## 📊 Common Commands

### Status & Logs
```powershell
# View all containers
docker compose ps

# Follow logs (all services)
docker compose logs -f

# Specific service logs
docker compose logs -f gateway
docker compose logs -f auth-service

# Last 100 lines
docker compose logs --tail=100
```

### Control Services
```powershell
# Start all
docker compose up -d

# Stop all
docker compose down

# Restart all
docker compose restart

# Restart specific service
docker compose restart gateway
```

### Database Access
```powershell
# PostgreSQL shell
docker compose exec postgres psql -U postgres -d auth_db

# Redis CLI
docker compose exec redis redis-cli

# List databases
docker compose exec postgres psql -U postgres -c "\l"
```

### Monitoring
```powershell
# Resource usage
docker stats

# Health status
docker compose ps
docker inspect --format='{{.State.Health.Status}}' dubaomatrung-gateway

# Disk usage
docker system df
```

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database
DB_PASSWORD=YourStrongPassword123!

# Redis (optional)
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=random_32_characters_minimum
REFRESH_TOKEN_SECRET=another_random_32_chars

# Server
SERVER_IP=103.56.160.66
NODE_ENV=production
```

### Port Mapping

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| Frontend | 80 | 80 | React app |
| Gateway | 3000 | 3000 | API Gateway |
| Auth | 3001 | 3001 | Auth service |
| User | 3002 | 3002 | User service |
| GIS | 3003 | 3003 | GIS service |
| Report | 3004 | 3004 | Report service |
| Admin | 3005 | 3005 | Admin service |
| Search | 3006 | 3006 | Search service |
| MapServer | 3007 | 3007 | MapServer |
| PostgreSQL | 5432 | 5433 | Database |
| Redis | 6379 | 6379 | Cache |

---

## 🐛 Troubleshooting

### Service Won't Start
```powershell
# Check logs
docker compose logs <service-name>

# Rebuild
docker compose build <service-name>
docker compose up -d <service-name>
```

### Database Issues
```powershell
# Check PostgreSQL status
docker compose exec postgres pg_isready -U postgres

# View database logs
docker compose logs postgres

# Reimport data
.\docker\import-initial-data.ps1
```

### Port Conflicts
```powershell
# Find process using port
netstat -ano | findstr "3000"

# Kill process
taskkill /PID <PID> /F
```

### Out of Disk Space
```powershell
# Clean unused data
docker system prune -a

# Remove unused images
docker image prune -a

# Check usage
docker system df
```

---

## 🔒 Security Notes

- ⚠️ Change default passwords before production
- ⚠️ Use strong JWT secrets (32+ characters)
- ⚠️ Configure Windows Firewall properly
- ⚠️ Regular backup schedule
- ⚠️ Keep Docker images updated
- ⚠️ Monitor logs for suspicious activity

---

## 📈 Performance Tips

1. **Resource Limits**: Configure in `docker-compose.yml`
2. **Redis Memory**: Set maxmemory policy
3. **PostgreSQL Tuning**: Adjust shared_buffers, work_mem
4. **Log Rotation**: Configure max file size
5. **Image Optimization**: Multi-stage builds used

---

## 🔄 Update Process

### Code Update (No Data Loss)
```powershell
# Pull new code or transfer files
cd C:\Deploy\DuBaoMatRung

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### With Database Migration
```powershell
# 1. Backup first!
.\docker\backup-databases.ps1

# 2. Update
docker compose down
docker compose build
docker compose up -d

# 3. Check migration logs
docker compose logs auth-service | Select-String "migration"
```

---

## 📞 Support

**Issues?** Check these files:
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Full troubleshooting guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Verify all steps

**Export debug info:**
```powershell
docker compose ps > status.txt
docker compose logs > logs.txt
docker system df > disk-usage.txt
```

---

## 📝 Additional Resources

- Docker Documentation: https://docs.docker.com/
- PostgreSQL 17: https://www.postgresql.org/docs/17/
- Redis: https://redis.io/documentation
- Docker Compose: https://docs.docker.com/compose/

---

**Built with ❤️ by LuckyBoiz**

**Ready to deploy? Start with [QUICKSTART.md](./QUICKSTART.md)! 🚀**
