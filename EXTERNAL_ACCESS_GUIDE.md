# Hướng Dẫn Khắc Phục Lỗi Không Truy Cập Được Từ Bên Ngoài

## Vấn Đề

- ✅ Localhost hoạt động: `http://localhost:5173`
- ❌ IP bên ngoài không hoạt động: `http://103.56.160.66:5173`

## Nguyên Nhân

1. **IP Address không đúng** - Cần xác định đúng IP public
2. **Windows Firewall** chặn ports
3. **Frontend build sai API URL**
4. **Docker binding chỉ localhost**
5. **Router/Cloud Security Groups**

## Giải Pháp Nhanh - 3 Bước

### Bước 1: Xác Định IP Đúng

Trên Windows Server, mở PowerShell:

```powershell
# Kiểm tra tất cả IP addresses
ipconfig

# Hoặc dùng
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" }

# Hoặc check public IP
curl ifconfig.me
```

**IP đúng của bạn là**: `103.56.161.66` (không phải .160.66)

### Bước 2: Fix Cấu Hình & Firewall

**Chạy script tự động (KHUYẾN NGHỊ):**

```powershell
# Chạy với quyền Administrator
# Right-click PowerShell → "Run as Administrator"

# Fix tất cả (mở firewall + update config + rebuild)
.\fix-external-access.ps1 -PublicIP "103.56.161.66"
```

**Script sẽ tự động:**
- ✅ Update `.env` file với IP đúng
- ✅ Rebuild client với API URL đúng
- ✅ Mở Windows Firewall ports
- ✅ Restart services

### Bước 3: Kiểm Tra

```powershell
# Check services đang chạy
docker-compose ps

# Test từ server
curl http://localhost:5173
curl http://103.56.161.66:5173

# Check firewall rules
Get-NetFirewallRule -DisplayName "DuBaoMatRung*"
```

## Giải Pháp Thủ Công (Nếu Script Không Chạy)

### 1. Mở Windows Firewall

```powershell
# Chạy PowerShell as Administrator

# Frontend
New-NetFirewallRule -DisplayName "DuBaoMatRung-Frontend" `
  -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow

# API Gateway
New-NetFirewallRule -DisplayName "DuBaoMatRung-API" `
  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# All services
$ports = 3001,3002,3003,3004,3005,3006,3007
foreach ($port in $ports) {
    New-NetFirewallRule -DisplayName "DuBaoMatRung-Port-$port" `
      -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow
}
```

### 2. Update `.env` File

Sửa file `.env`:

```env
# Thay YOUR_PUBLIC_IP bằng IP thật
VITE_API_URL=http://103.56.161.66:3000
FRONTEND_URL=http://103.56.161.66:5173
CORS_ORIGINS=http://localhost:5173,http://103.56.161.66:5173
```

### 3. Rebuild Client

```powershell
# Rebuild client với API URL đúng
docker-compose build client --build-arg VITE_API_URL=http://103.56.161.66:3000

# Restart
docker-compose restart client gateway
```

## Kiểm Tra Cloud/Router (Nếu Vẫn Không Được)

### Nếu đang dùng Cloud Provider (AWS/Azure/GCP)

#### AWS EC2:
1. Vào **EC2 Console** → **Security Groups**
2. Chọn Security Group của instance
3. **Inbound Rules** → Add rules:
   - Type: Custom TCP
   - Port Range: 5173, 3000-3007
   - Source: 0.0.0.0/0 (hoặc IP của bạn)

#### Azure VM:
1. Vào **Virtual Machines** → chọn VM
2. **Networking** → **Add inbound port rule**
3. Add ports: 5173, 3000-3007

#### Google Cloud:
1. Vào **VPC Network** → **Firewall Rules**
2. Create new rule:
   - Ports: tcp:5173,3000-3007
   - Source: 0.0.0.0/0

### Nếu đang dùng Router/NAT

Cần config **Port Forwarding** trên router:

```
External Port → Internal IP:Port
5173 → 192.168.x.x:5173
3000 → 192.168.x.x:3000
```

## Verification Checklist

Sau khi làm xong, kiểm tra:

```powershell
# 1. Docker containers đang chạy
docker-compose ps
# → Tất cả services phải "Up"

# 2. Ports đang listen
netstat -ano | findstr ":5173"
netstat -ano | findstr ":3000"
# → Phải thấy "0.0.0.0:5173" và "0.0.0.0:3000"

# 3. Firewall rules tồn tại
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "DuBaoMatRung*" }
# → Phải thấy các rules đã tạo

# 4. Test local access
curl http://localhost:5173
# → Phải trả về HTML

# 5. Test public IP access
curl http://103.56.161.66:5173
# → Phải trả về HTML (giống localhost)
```

## Debug Logs

Nếu vẫn có vấn đề:

```powershell
# Xem logs của client
.\deploy.ps1 -Logs -Service client

# Xem logs của gateway
.\deploy.ps1 -Logs -Service gateway

# Check network
docker network inspect dubaomatrung-network

# Check container binding
docker inspect dubaomatrung-client | findstr "HostPort"
```

## Common Issues

### Issue 1: Client trả về "Cannot connect to API"

**Nguyên nhân**: Frontend build với localhost API URL

**Fix**:
```powershell
# Rebuild với IP đúng
docker-compose build client --build-arg VITE_API_URL=http://103.56.161.66:3000
docker-compose restart client
```

### Issue 2: CORS Error

**Nguyên nhân**: Gateway không cho phép origin từ IP public

**Fix**: Update `.env`:
```env
CORS_ORIGINS=http://localhost:5173,http://103.56.161.66:5173
```

Sau đó restart gateway:
```powershell
docker-compose restart gateway
```

### Issue 3: Connection Timeout

**Nguyên nhân**: Firewall/Router chặn

**Check**:
```powershell
# Test từ máy khác (không phải server)
curl http://103.56.161.66:5173

# Nếu timeout → Firewall/Router issue
# Nếu trả về HTML → OK
```

## Quick Fix Command

Một lệnh để fix tất cả (chạy as Administrator):

```powershell
# Fix everything at once
.\fix-external-access.ps1 -PublicIP "103.56.161.66"
```

## Sau Khi Fix Xong

Truy cập từ bất kỳ máy nào:

- **Frontend**: http://103.56.161.66:5173
- **API Gateway**: http://103.56.161.66:3000/health

Nếu vẫn không được, liên hệ với:
- Network admin (nếu có)
- Cloud provider support
- ISP (nếu dùng network công ty)

## Production Recommendations

Sau khi test OK, nên:

1. **Setup Domain**: Thay vì IP, dùng domain name
   - Mua domain và point A record đến IP
   - Update `.env` với domain

2. **Enable HTTPS**: Dùng reverse proxy (nginx) + Let's Encrypt
   ```
   https://yourdomain.com
   ```

3. **Restrict Firewall**: Chỉ mở ports cần thiết
   - Frontend: 443 (HTTPS)
   - API: Chỉ cho phép từ frontend

4. **Use Environment Variables**: Không hardcode IP trong config

---

**TL;DR**: Chạy `.\fix-external-access.ps1 -PublicIP "103.56.161.66"` với quyền Administrator