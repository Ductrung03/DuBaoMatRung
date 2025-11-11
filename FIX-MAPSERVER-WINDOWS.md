# 🔧 FIX: MapServer không hiển thị dữ liệu trên Windows Server

## 📋 Vấn đề

MapServer có dữ liệu trong database nhưng **không hiển thị lên map** khi deploy trên Windows Server với Docker.

## 🎯 Nguyên nhân

### 1. **Lỗi SRID Typo** ✅ ĐÃ SỬA
```
File: mapserver/mapfiles/laocai.map
Dòng 290: SRID=4236 ❌ (SAI)
Phải là: SRID=4326 ✅ (ĐÚNG)
```

### 2. **Connection String Issues**
- Container `mapserver-service` cần connect đến `admin-postgis:5432`
- Trên Windows Docker, cần đảm bảo containers cùng network

### 3. **CORS Configuration**
- Frontend cần đúng URL: `http://103.56.160.66:3000/api/mapserver`
- Gateway đã được config CORS nhưng cần verify

## 🚀 Giải pháp - Chạy theo thứ tự

### BƯỚC 1: Fix SRID Typo ✅ ĐÃ XONG

File đã được sửa tự động:
```
mapserver/mapfiles/laocai.map:290
SRID=4236 -> SRID=4326
```

### BƯỚC 2: Chạy diagnostic script

```powershell
.\fix-mapserver-windows.ps1
```

Script này sẽ kiểm tra:
- ✅ Container status
- ✅ Network connectivity giữa mapserver ↔ admin-postgis
- ✅ Database tables tồn tại
- ✅ PostgreSQL connection working
- ✅ Mapfile configuration
- ✅ WMS endpoints responding
- ✅ Gateway proxy working

### BƯỚC 3: Rebuild MapServer container

```powershell
.\rebuild-mapserver.ps1
```

Script này sẽ:
1. Stop mapserver-service
2. Remove old container
3. Rebuild image with fix
4. Start new container
5. Verify health

### BƯỚC 4: Test WMS endpoints

```powershell
.\test-mapserver.ps1
```

Kiểm tra:
- Health check
- GetCapabilities
- GetMap rendering
- Database connectivity

### BƯỚC 5: Verify trên browser

1. Mở: `http://103.56.160.66:5173`
2. Bật DevTools (F12)
3. Vào tab **Console**
4. Check errors:
   - CORS errors → Gateway issue
   - 404/500 errors → MapServer issue
   - Network errors → Docker network issue

## 🔍 Debugging Steps

### Kiểm tra MapServer logs
```powershell
docker logs dubaomatrung-mapserver --tail 50
```

### Kiểm tra Gateway logs
```powershell
docker logs dubaomatrung-gateway --tail 50
```

### Test WMS GetCapabilities trực tiếp
```powershell
curl "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

### Test qua Gateway
```powershell
curl "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

### Test GetMap (render layer)
```powershell
curl "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=huyen&CRS=EPSG:4326&BBOX=103.5,21.8,104.5,23.0&WIDTH=400&HEIGHT=400&FORMAT=image/png" --output test-map.png
```

### Kiểm tra network giữa containers
```powershell
docker exec dubaomatrung-mapserver ping -c 2 admin-postgis
docker exec dubaomatrung-mapserver nc -zv admin-postgis 5432
```

### Test PostgreSQL connection từ MapServer
```powershell
docker exec dubaomatrung-mapserver sh -c "apk add postgresql-client && PGPASSWORD=4 psql -h admin-postgis -U postgres -d admin_db -c 'SELECT COUNT(*) FROM laocai_huyen;'"
```

## 📊 Expected Results

### ✅ Successful MapServer Response

**GetCapabilities:**
```xml
<WMS_Capabilities version="1.3.0">
  <Service>
    <Name>WMS</Name>
    <Title>Lao Cai GIS Services</Title>
  </Service>
  <Capability>
    <Layer>
      <Name>ranhgioihc</Name>
      <Title>Ranh Giới Hành Chính</Title>
    </Layer>
    <Layer>
      <Name>rg3lr</Name>
      <Title>3 Loại Rừng</Title>
    </Layer>
    <!-- ... more layers ... -->
  </Capability>
</WMS_Capabilities>
```

**GetMap:**
- Content-Type: `image/png`
- File size: > 5 KB (có dữ liệu)
- File size: < 2 KB (blank/error)

## 🔧 Common Issues & Solutions

### Issue 1: Container không kết nối được database
```powershell
# Check network
docker network ls
docker network inspect dubaomatrung_default

# Restart containers
docker-compose restart mapserver-service admin-postgis
```

### Issue 2: Mapfile không tìm thấy
```powershell
# Verify volume mount
docker inspect dubaomatrung-mapserver | grep -A 10 Mounts

# Should see: ./mapserver:/mapserver:ro
```

### Issue 3: CORS errors trên browser
```powershell
# Rebuild gateway với CORS fix
.\rebuild-gateway.ps1
```

### Issue 4: Blank map (không có lỗi nhưng không hiện data)

**Nguyên nhân thường gặp:**
1. Tables empty trong database
2. Geometry không hợp lệ
3. SRID không khớp (4326 vs 4236)
4. Bounding box không đúng

**Fix:**
```powershell
# Check table data
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*), ST_SRID(geom) FROM laocai_huyen GROUP BY ST_SRID(geom);"

# Should return:
# count | st_srid
# ------|--------
# 9     | 4326
```

## 🎉 Success Checklist

- [ ] ✅ `fix-mapserver-windows.ps1` - All checks pass
- [ ] ✅ `rebuild-mapserver.ps1` - Container rebuilt successfully
- [ ] ✅ `test-mapserver.ps1` - All tests pass
- [ ] ✅ WMS GetCapabilities returns valid XML with layers
- [ ] ✅ WMS GetMap returns PNG image with data
- [ ] ✅ Browser console has no errors
- [ ] ✅ Map displays layers correctly

## 📝 Configuration Files

### Key files đã được sửa:

1. **mapserver/mapfiles/laocai.map**
   - ✅ Fixed SRID typo: 4236 → 4326

2. **microservices/gateway/src/index.js**
   - ✅ CORS configured for MapServer
   - ✅ Proxy routing: `/api/mapserver` → MapServer service

3. **docker-compose.yml**
   - ✅ MapServer service configured
   - ✅ Volume mount: `./mapserver:/mapserver:ro`
   - ✅ Depends on: admin-postgis

## 📞 Next Steps if Still Not Working

1. **Export diagnostic logs:**
   ```powershell
   docker logs dubaomatrung-mapserver > mapserver-logs.txt
   docker logs dubaomatrung-gateway > gateway-logs.txt
   docker logs dubaomatrung-admin-postgis > db-logs.txt
   ```

2. **Check database import:**
   ```powershell
   .\check-all-tables.ps1
   ```

3. **Verify frontend environment:**
   ```powershell
   # Client should use: http://103.56.160.66:3000/api/mapserver
   # NOT: http://localhost:3007
   ```

4. **Test with minimal layer:**
   ```
   Try loading just one layer first: "huyen" (9 polygons)
   Then add more layers incrementally
   ```

## 🆘 Contact Info

Nếu vẫn gặp vấn đề, cung cấp:
1. Output của `fix-mapserver-windows.ps1`
2. Output của `test-mapserver.ps1`
3. Browser console errors (screenshot)
4. MapServer logs (20 dòng cuối)

---

**Created:** 2025-11-11
**Author:** Claude Code
**Status:** ✅ Scripts ready, waiting for deployment test
