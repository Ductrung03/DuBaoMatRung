# 🚀 Deployment Guide - Du Bao Mat Rung

## 📋 Tổng quan

Có 3 chế độ deployment:

1. **Production Mode** - Build optimized, không hot reload
2. **Development Mode** - Hot reload enabled, không cần rebuild
3. **Quick Update** - Tự động detect changes và chỉ restart service cần thiết

---

## 🏭 Production Mode (Khuyến nghị cho production server)

### Lần đầu tiên
```powershell
cd C:\DuBaoMatRung
.\deploy-docker.ps1 -FirstTime
```

### Update code (rebuild toàn bộ)
```powershell
.\deploy-docker.ps1
```

### Rebuild với cache clear
```powershell
.\deploy-docker.ps1 -Rebuild
```

### Dừng services
```powershell
.\deploy-docker.ps1 -Stop
```

**Ưu điểm:**
- ✅ Build optimized cho production
- ✅ Image size nhỏ
- ✅ Performance tốt nhất

**Nhược điểm:**
- ❌ Phải rebuild mỗi lần sửa code (chậm)

---

## 🔥 Development Mode (Hot Reload - Không cần rebuild!)

### Lần đầu tiên
```powershell
cd C:\DuBaoMatRung
.\deploy-docker-dev.ps1 -FirstTime
```

### Chạy dev mode (lần sau)
```powershell
.\deploy-docker-dev.ps1
```

### Dừng dev mode
```powershell
.\deploy-docker-dev.ps1 -Stop
```

**Ưu điểm:**
- ✅ Code changes tự động reload
- ✅ Không cần rebuild
- ✅ Dev workflow nhanh
- ✅ Live debugging

**Nhược điểm:**
- ❌ Không optimize cho production
- ❌ Image size lớn hơn

**Cách hoạt động:**
- Sửa file trong `client/src` → Frontend tự reload
- Sửa file trong `microservices/*/src` → Backend tự reload
- Không cần chạy lệnh gì!

---

## ⚡ Quick Update (Smart Restart - Khuyến nghị cho cập nhật nhỏ)

### Tự động detect và restart
```powershell
.\quick-update.ps1
```

Script sẽ:
1. Pull latest code từ git
2. Tự động phát hiện file nào thay đổi
3. Chỉ rebuild và restart service bị ảnh hưởng

### Restart service cụ thể
```powershell
# Chỉ restart client
.\quick-update.ps1 -Services @("client")

# Restart nhiều services
.\quick-update.ps1 -Services @("client", "auth-service", "gateway")
```

**Ưu điểm:**
- ✅ Nhanh (chỉ rebuild service cần thiết)
- ✅ Tự động detect changes
- ✅ Production-ready builds

---

## 🛠️ Rebuild từng service riêng lẻ

### Không dùng script (Manual)

```powershell
cd C:\DuBaoMatRung

# Chỉ rebuild client
docker-compose build client
docker-compose up -d client

# Chỉ rebuild auth-service
docker-compose build auth-service
docker-compose up -d auth-service

# Rebuild nhiều services cùng lúc
docker-compose build client auth-service gateway
docker-compose up -d client auth-service gateway
```

---

## 📊 Kiểm tra trạng thái

### Xem status tất cả services
```powershell
docker-compose ps
```

### Xem logs
```powershell
# Logs của một service
docker-compose logs -f client
docker-compose logs -f auth-service

# Logs của tất cả services
docker-compose logs -f

# Logs 100 dòng cuối
docker-compose logs --tail=100 client
```

### Xem resource usage
```powershell
docker stats
```

---

## 🔍 Troubleshooting

### Service không start được
```powershell
# Xem logs chi tiết
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild và restart
docker-compose build [service-name]
docker-compose up -d [service-name]
```

### Database issues
```powershell
# Reset database (XÓA TẤT CẢ DỮ LIỆU!)
docker-compose down -v
.\deploy-docker.ps1 -FirstTime
```

### Port conflicts
```powershell
# Xem process đang dùng port
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Kill process theo PID
taskkill /F /PID [PID]
```

### Clear Docker cache
```powershell
# Clean up unused images
docker system prune -a

# Remove all containers
docker-compose down
docker rm $(docker ps -a -q)

# Remove all images
docker rmi $(docker images -q)
```

---

## 📝 So sánh các phương pháp

| Phương pháp | Rebuild Time | Hot Reload | Use Case |
|------------|--------------|------------|----------|
| `deploy-docker.ps1` | ~5-10 phút | ❌ | Production deployment |
| `deploy-docker-dev.ps1` | ~2-3 phút (1 lần) | ✅ | Active development |
| `quick-update.ps1` | ~1-3 phút | ❌ | Quick fixes/updates |
| Manual rebuild | ~30s - 2 phút | ❌ | Single service update |

---

## 💡 Khuyến nghị

**Đang develop (local/test server):**
```powershell
.\deploy-docker-dev.ps1
# Sau đó chỉ cần sửa code, tự động reload!
```

**Fix bug nhỏ (production):**
```powershell
.\quick-update.ps1
# Auto-detect và chỉ restart service cần thiết
```

**Deploy major update (production):**
```powershell
.\deploy-docker.ps1
# Full rebuild với optimization
```

**Update một service cụ thể:**
```powershell
docker-compose build [service-name]
docker-compose up -d [service-name]
```

---

## 🔐 Security Notes

**Production:**
- ✅ Sử dụng `.env` riêng với mật khẩu mạnh
- ✅ Set `NODE_ENV=production`
- ✅ Enable firewall và chỉ mở cần thiết
- ✅ Regular backup databases

**Development:**
- ⚠️ Không expose dev server ra internet
- ⚠️ Sử dụng dev credentials riêng
- ⚠️ Không commit `.env` vào git
