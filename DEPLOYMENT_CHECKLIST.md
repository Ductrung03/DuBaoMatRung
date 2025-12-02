# 📋 Deployment Checklist

Checklist đầy đủ để deploy DuBaoMatRung lên Windows Server.

## ✅ Pre-Deployment (Trên Development Machine)

### Data Preparation
- [ ] Export database hiện tại
  ```bash
  ./docker/export-current-data.sh
  ```
- [ ] Verify export thành công (3 files SQL trong `docker/initial-data/`)
- [ ] Kiểm tra dung lượng files SQL

### Code Preparation
- [ ] Commit tất cả changes
  ```bash
  git status
  git add .
  git commit -m "Ready for deployment"
  ```
- [ ] Test build local
  ```bash
  docker compose build
  ```
- [ ] Clean node_modules không cần thiết
- [ ] Remove logs cũ

### Package Project
- [ ] Tạo archive
  ```bash
  tar -czf DuBaoMatRung.tar.gz \
    --exclude=node_modules \
    --exclude=*/node_modules \
    --exclude=*/logs \
    DuBaoMatRung/
  ```
- [ ] Verify archive size (~300-500MB)
- [ ] Test extract archive

---

## 🖥️ Windows Server Preparation

### System Requirements
- [ ] Windows Server 2019/2022 hoặc Windows 10/11 Pro
- [ ] RAM: >= 8GB (khuyến nghị 16GB)
- [ ] Disk: >= 50GB free space
- [ ] CPU: >= 4 cores

### Software Installation
- [ ] Cài Docker Desktop for Windows
  - Download: https://www.docker.com/products/docker-desktop
- [ ] Enable WSL 2 backend
- [ ] Start Docker Desktop
- [ ] Verify Docker: `docker version`
- [ ] Verify Docker Compose: `docker compose version`

### Network Configuration
- [ ] Open Windows Firewall ports:
  - 80 (Frontend)
  - 3000 (Gateway)
  - 3001-3007 (Services)
  - 5433 (PostgreSQL)
  - 6379 (Redis)
- [ ] Verify server IP: `ipconfig`
- [ ] Test connectivity from external network

### File Transfer
- [ ] Transfer archive to Windows Server
  - Option A: SCP/SFTP
  - Option B: RDP copy/paste
  - Option C: Cloud storage (Google Drive, OneDrive)
- [ ] Verify file integrity (checksum nếu có)
- [ ] Extract archive
  ```powershell
  tar -xzf DuBaoMatRung.tar.gz
  ```

---

## ⚙️ Configuration

### Environment Variables
- [ ] Copy template
  ```powershell
  Copy-Item env.docker.example .env
  ```
- [ ] Generate JWT secrets
  ```powershell
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
  ```
- [ ] Update `.env` với:
  - [ ] `DB_PASSWORD` (strong password)
  - [ ] `JWT_SECRET` (32+ characters)
  - [ ] `REFRESH_TOKEN_SECRET` (32+ characters)
  - [ ] `SERVER_IP` (103.56.160.66)
  - [ ] `REDIS_PASSWORD` (optional, để trống nếu không dùng)

### Frontend Configuration
- [ ] Update API URL trong `client/src/config.js` (nếu cần)
- [ ] Verify CORS settings trong gateway

---

## 🚀 Deployment

### Initial Deploy
- [ ] Run deploy script
  ```powershell
  .\deploy-windows.ps1
  ```
- [ ] Wait for build completion (15-20 phút)
- [ ] Verify all images built successfully
- [ ] Wait for containers to start
- [ ] Check data import completed

### Verification
- [ ] All containers running
  ```powershell
  docker compose ps
  # Expected: 9 containers with status "Up"
  ```
- [ ] Health checks passing
  ```powershell
  docker inspect --format='{{.State.Health.Status}}' dubaomatrung-gateway
  # Expected: "healthy"
  ```
- [ ] No errors in logs
  ```powershell
  docker compose logs | Select-String "error" -CaseSensitive
  ```

---

## 🧪 Testing

### Basic Tests
- [ ] Frontend accessible: http://103.56.160.66
- [ ] API Gateway health: http://103.56.160.66:3000/health
- [ ] Swagger docs: http://103.56.160.66:3000/api-docs

### Service Tests
- [ ] Gateway responds: `curl http://localhost:3000/health`
- [ ] Auth service: `curl http://localhost:3001/health`
- [ ] User service: `curl http://localhost:3002/health`
- [ ] GIS service: `curl http://localhost:3003/health`
- [ ] Report service: `curl http://localhost:3004/health`
- [ ] Admin service: `curl http://localhost:3005/health`
- [ ] Search service: `curl http://localhost:3006/health`
- [ ] MapServer service: `curl http://localhost:3007/health`

### Database Tests
- [ ] Connect to PostgreSQL
  ```powershell
  docker compose exec postgres psql -U postgres -d auth_db
  ```
- [ ] Check tables exist: `\dt`
- [ ] Check data imported: `SELECT COUNT(*) FROM "User";`
- [ ] Verify Redis connection
  ```powershell
  docker compose exec redis redis-cli ping
  # Expected: PONG
  ```

### Authentication Tests
- [ ] Login với admin account
- [ ] Verify JWT token generation
- [ ] Test protected endpoints
- [ ] Check permissions

### Frontend Tests
- [ ] Homepage loads
- [ ] Login page works
- [ ] Dashboard accessible after login
- [ ] Map displays correctly
- [ ] API calls successful (check Network tab)

---

## 🔒 Security Hardening

### Credentials
- [ ] Change default admin password
- [ ] Update DB_PASSWORD trong .env
- [ ] Rotate JWT secrets
- [ ] Set Redis password (nếu cần)

### Firewall
- [ ] Configure Windows Firewall rules
- [ ] Restrict ports to necessary IPs only
- [ ] Enable logging for suspicious activity

### Docker Security
- [ ] Limit container resources
- [ ] Enable Docker content trust
- [ ] Regular image updates

### Application Security
- [ ] Test CORS configuration
- [ ] Verify HTTPS (nếu có SSL)
- [ ] Check CSP headers
- [ ] Test rate limiting

---

## 📊 Monitoring Setup

### Logging
- [ ] Configure log rotation
- [ ] Set log level (info/debug)
- [ ] Verify logs are being written
  ```powershell
  docker compose logs --tail=50
  ```

### Backup
- [ ] Test manual backup
  ```powershell
  .\docker\backup-databases.ps1
  ```
- [ ] Schedule automatic backups (Windows Task Scheduler)
- [ ] Test restore procedure
- [ ] Store backups in safe location

### Metrics
- [ ] Monitor resource usage
  ```powershell
  docker stats
  ```
- [ ] Set up alerts (nếu cần)
- [ ] Monitor disk space

---

## 📝 Documentation

### Project Documentation
- [ ] Update deployment date
- [ ] Document any custom configurations
- [ ] Note server credentials (secure location)
- [ ] Document backup locations

### Handover
- [ ] Create admin guide
- [ ] Document common operations
- [ ] Provide troubleshooting steps
- [ ] Share access credentials securely

---

## 🔄 Post-Deployment

### Monitoring (First 24h)
- [ ] Check logs hourly
- [ ] Monitor resource usage
- [ ] Watch for errors
- [ ] Test all features

### Performance
- [ ] Test response times
- [ ] Check database query performance
- [ ] Monitor memory usage
- [ ] Verify no memory leaks

### User Acceptance
- [ ] Have users test all features
- [ ] Gather feedback
- [ ] Fix critical issues immediately
- [ ] Plan for improvements

---

## 🆘 Rollback Plan

### If Deployment Fails
- [ ] Have backup of old system
- [ ] Know how to restore from backup
  ```powershell
  docker compose down
  .\docker\restore-databases.sh .\backups\<backup-folder>
  docker compose up -d
  ```
- [ ] Document rollback procedure
- [ ] Test rollback before going live

---

## ✅ Final Sign-Off

- [ ] All tests passed
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Users can access system
- [ ] Backup configured
- [ ] Monitoring active
- [ ] Documentation complete

**Deployment Date**: _______________

**Deployed By**: _______________

**Approved By**: _______________

---

## 📞 Support Contacts

- **Developer**: LuckyBoiz
- **Server Admin**: _______________
- **Emergency Contact**: _______________

---

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
