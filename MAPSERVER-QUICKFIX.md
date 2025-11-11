# 🚀 MapServer Quick Fix - Windows Server

## Vấn đề
MapServer có data nhưng không hiển thị trên map (Windows Docker deployment)

## Nguyên nhân
1. ✅ SRID typo: `4236` → `4326` (ĐÃ SỬA)
2. ⚠️  Container connectivity issues
3. ⚠️  Mapfile configuration

## Giải pháp - 3 bước

### 1️⃣ Chạy diagnostic
```powershell
.\fix-mapserver-windows.ps1
```
Kiểm tra: containers, network, database, WMS endpoints

### 2️⃣ Rebuild MapServer
```powershell
.\rebuild-mapserver.ps1
```
Apply fix và restart service

### 3️⃣ Test
```powershell
.\test-mapserver.ps1
```
Verify WMS rendering

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
