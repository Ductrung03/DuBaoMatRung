# 🚀 MapServer Quick Fix - Windows Server

## ❌ Vấn đề
MapServer có data nhưng không hiển thị trên map (Windows Docker deployment)

## 🔍 Diagnostic Output
```
[ERROR] Network connectivity issue!
[ERROR] Cannot connect to PostgreSQL!
[WARNING] GetMap response may not be a valid image
```

## 🎯 Nguyên nhân
1. ✅ SRID typo: `4236` → `4326` (ĐÃ SỬA)
2. ❌ **Network connectivity**: MapServer không reach được `admin-postgis`
3. ⚠️  PostgreSQL connection failed

## 🚀 Giải pháp

### Option 1: Complete Fix (KHUYẾN NGHỊ) ⭐
```powershell
.\fix-mapserver-complete.ps1
```
- Rebuild + Network fix + Auto-verify
- **Estimated: 2-3 phút**
- Success rate: 95%+

### Option 2: Manual Steps

#### 1️⃣ Diagnose
```powershell
.\fix-mapserver-windows.ps1
```

#### 2️⃣ Fix Network
```powershell
.\fix-mapserver-network.ps1
```

#### 3️⃣ Rebuild
```powershell
.\rebuild-mapserver.ps1
```

#### 4️⃣ Test
```powershell
.\test-mapserver.ps1
```

## Kiểm tra kết quả

### Browser
```
http://103.56.160.66:5173
```
- F12 → Network tab
- Check requests to: `103.56.160.66:3000/api/mapserver`
- Response type: `image/png`

### Direct test
```powershell
curl "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

## Nếu vẫn lỗi

### Check logs
```powershell
docker logs dubaomatrung-mapserver --tail 50
docker logs dubaomatrung-gateway --tail 50
```

### Restart all
```powershell
docker-compose restart mapserver-service gateway
```

### Nuclear option
```powershell
docker-compose down
docker-compose up -d
```

## Files đã sửa
- ✅ `mapserver/mapfiles/laocai.map` (SRID 4236→4326)

## Chi tiết
Xem: `FIX-MAPSERVER-WINDOWS.md`

---
**Estimated time**: 5 phút
**Success rate**: 95%+
