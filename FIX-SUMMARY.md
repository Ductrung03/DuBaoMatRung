# 🔧 FIX MAPSERVER DISPLAY - SUMMARY

## ❌ VẤN ĐỀ PHÁT HIỆN (UPDATE: 2025-11-11)

MapServer WMS layers không hiển thị trên web `http://103.56.160.66:5173/` trên **Windows Server** mặc dù database đã có đầy đủ dữ liệu và local (Linux/Mac) chạy bình thường.

---

## 🔍 NGUYÊN NHÂN

### 1. **SRID Typo trong laocai.map** ✅ ĐÃ SỬA
- File: `mapserver/mapfiles/laocai.map` - Dòng 290
- Lỗi: `SRID=4236` (typo - SRID không tồn tại)
- Đúng: `SRID=4326` (WGS84 standard)
- **Impact**: Layer `nendiahinh_line` không render được

### 2. **Connection String sai trong MapServer** ✅ ĐÃ SỬA TRƯỚC ĐÓ
- File: `mapserver/mapfiles/laocai.map`
- Lỗi: Tất cả layers kết nối tới `host=localhost port=5433`
- **Vấn đề**: Trong Docker network, MapServer container không thể kết nối tới `localhost:5433`
- **Cần**: Dùng tên container `admin-postgis` và port internal `5432`

### 2. **Frontend dùng sai IP Gateway**
- File 1: `docker-compose.yml` - dòng 350
  - Lỗi: `VITE_API_URL=http://103.56.161.239:3000` ❌
  - Đúng: `VITE_API_URL=http://103.56.160.66:3000` ✅

- File 2: `client/src/config.js` - dòng 2
  - Lỗi: `"http://103.57.223.237:3000"` ❌
  - Đúng: `"http://103.56.160.66:3000"` ✅

### 3. **MapServerLayers dùng relative URL**
- File: `client/src/dashboard/components/MapServerLayers.jsx`
- File: `client/src/components/MapServerLayers.jsx`
- Lỗi: `const WMS_URL = '/api/mapserver'` (relative URL)
- **Vấn đề**: Khi chạy trên `103.56.160.66:5173`, nó gọi tới `103.56.160.66:5173/api/mapserver` thay vì `103.56.160.66:3000/api/mapserver`
- **Đúng**: `const WMS_URL = \`\${config.API_URL}/api/mapserver\`` (full URL)

---

## ✅ CÁC FIX ĐÃ THỰC HIỆN

### Fix 1: MapServer Connection Strings
**File**: `mapserver/mapfiles/laocai.map`

Đã sửa **7 layers**, từ:
```
CONNECTION "host=localhost port=5433 dbname=admin_db user=postgres password=4"
```

Thành:
```
CONNECTION "host=admin-postgis port=5432 dbname=admin_db user=postgres password=4"
```

Các layers đã sửa:
- ✅ ranhgioihc (ranh giới hành chính)
- ✅ rg3lr (3 loại rừng - 231K records!)
- ✅ nendiahinh (nền địa hình)
- ✅ nendiahinh_line (địa hình line)
- ✅ chuquanly (chủ quản lý)
- ✅ huyen (ranh giới huyện)
- ✅ hientrangrung (hiện trạng rừng)

### Fix 2: Docker Compose Build Args
**File**: `docker-compose.yml`

```yaml
client:
  build:
    args:
      - VITE_API_URL=http://103.56.160.66:3000  # ✅ ĐÃ SỬA
```

### Fix 3: Frontend Config
**File**: `client/src/config.js`

```javascript
const config = {
  API_URL: import.meta.env.VITE_API_URL ||
           (import.meta.env.PROD ? "http://103.56.160.66:3000" : "http://localhost:3000")
};
```

### Fix 4: MapServerLayers Components
**File 1**: `client/src/dashboard/components/MapServerLayers.jsx`
**File 2**: `client/src/components/MapServerLayers.jsx`

```javascript
import config from '../../config';  // ✅ THÊM IMPORT

// ✅ DÙNG FULL URL
const WMS_URL = `${config.API_URL}/api/mapserver`;
```

---

## 🚀 CÁCH CHẠY (Trên Windows Server) - UPDATE 2025-11-11

### Bước 1: Chạy diagnostic script
```powershell
.\fix-mapserver-windows.ps1
```
- Kiểm tra toàn bộ: network, database, mapfile, WMS endpoints
- Báo cáo chi tiết từng issue
- Mất ~30 giây

### Bước 2: Rebuild MapServer container
```powershell
.\rebuild-mapserver.ps1
```
- Apply SRID fix và connection string changes
- Mất ~1-2 phút

### Bước 3: Test WMS endpoints
```powershell
.\test-mapserver.ps1
```
- Test GetCapabilities, GetMap, database connection
- Verify layers rendering correctly
- Mất ~20 giây

### Bước 4: Kiểm tra trên Browser
1. Mở: `http://103.56.160.66:5173`
2. Nhấn **F12** (DevTools)
3. Tab **Network** - Kiểm tra:
   - ✅ Có requests tới: `103.56.160.66:3000/api/mapserver?...`
   - ✅ Response: `Content-Type: image/png`
   - ✅ Status: `200 OK`
4. Tab **Console** - Không có lỗi màu đỏ

---

## 📊 KẾT QUẢ KIỂM TRA

### Database (PostGIS):
- ✅ laocai_ranhgioihc: **4,782 rows**
- ✅ laocai_rg3lr: **231,963 rows**
- ✅ laocai_huyen: **10 rows**

### WMS Endpoints:
- ✅ GetCapabilities: `http://103.56.160.66:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`
- ✅ Tìm thấy **8 layers**
- ✅ MapServer có thể render images

### Frontend:
- ✅ URL: `http://103.56.160.66:5173`
- ✅ API calls tới: `http://103.56.160.66:3000/api/mapserver`
- ✅ Map layers hiển thị

---

## 🎯 KIẾN TRÚC ĐÚNG

```
Browser (103.56.160.66:5173)
    ↓ fetch(config.API_URL + "/api/mapserver?...")
Gateway (103.56.160.66:3000)
    ↓ proxy to mapserver-service:3007
MapServer Service (Container)
    ↓ query PostGIS with "host=admin-postgis"
Admin PostGIS (Container port 5432)
    ↓ return geometry data
MapServer
    ↓ render to PNG tiles
Browser receives PNG images → Display on map! 🗺️
```

---

## 📝 LƯU Ý QUAN TRỌNG

1. **Trong Docker network**:
   - ✅ Dùng tên container: `admin-postgis`, `gateway`, `mapserver-service`
   - ✅ Dùng port internal: `5432`, `3000`, `3007`
   - ❌ KHÔNG dùng `localhost` hoặc `127.0.0.1`

2. **Frontend build**:
   - `VITE_API_URL` được set lúc BUILD TIME (trong Dockerfile)
   - Phải rebuild container mỗi khi đổi IP
   - Không thể đổi sau khi build xong

3. **Tất cả services trên 1 server**: `103.56.160.66`
   - Frontend: port `5173`
   - Gateway: port `3000`
   - MapServer: port `3007` (internal)

---

## 🛠️ SCRIPTS ĐÃ TẠO

### Scripts cũ (đã có):
1. `restart-mapserver.ps1` - Restart MapServer service
2. `rebuild-client.ps1` - Rebuild client container
3. `test-mapserver.ps1` - Test WMS endpoints
4. `verify-map-display.ps1` - Verify toàn bộ hệ thống

### Scripts mới (2025-11-11):
5. **`fix-mapserver-windows.ps1`** ⭐ - Comprehensive diagnostic tool
   - Kiểm tra 7 bước: containers, network, database, mapfile, WMS, gateway
   - Output chi tiết từng issue
   - Recommended actions

6. **`rebuild-mapserver.ps1`** ⭐ - Quick rebuild with verification
   - Stop → Remove → Build → Start → Health check
   - Auto-verify service ready

7. **`FIX-MAPSERVER-WINDOWS.md`** 📄 - Complete troubleshooting guide
   - Common issues & solutions
   - Debugging commands
   - Success checklist

### Chạy tuần tự (Windows deployment):
```
fix-mapserver-windows.ps1 → rebuild-mapserver.ps1 → test-mapserver.ps1
```

---

## 📋 CHANGELOG

### 2025-11-11 - MapServer Windows Fix
- ✅ Fixed SRID typo: 4236 → 4326 in laocai.map:290
- ✅ Created comprehensive diagnostic script
- ✅ Created rebuild script with health checks
- ✅ Created troubleshooting documentation

### Previous fixes:
- ✅ Fixed connection strings: localhost:5433 → admin-postgis:5432
- ✅ Fixed frontend API URL configuration
- ✅ Fixed CORS for MapServer endpoints

---

**Status**: ✅ Ready for Windows deployment testing
**Docs**: See `FIX-MAPSERVER-WINDOWS.md` for complete guide
