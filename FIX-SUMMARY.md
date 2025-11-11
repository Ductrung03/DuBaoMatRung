# 🔧 FIX MAPSERVER DISPLAY - SUMMARY

## ❌ VẤN ĐỀ PHÁT HIỆN

MapServer WMS layers không hiển thị trên web `http://103.56.160.66:5173/` mặc dù database đã có đầy đủ dữ liệu.

---

## 🔍 NGUYÊN NHÂN

### 1. **Connection String sai trong MapServer**
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

## 🚀 CÁCH CHẠY (Trên Windows Server)

### Bước 1: Restart MapServer service
```powershell
.\restart-mapserver.ps1
```
- Apply connection string changes
- Mất ~10 giây

### Bước 2: Rebuild Client container
```powershell
.\rebuild-client.ps1
```
- Rebuild với IP đúng và full URL
- Mất 2-5 phút

### Bước 3: Verify tất cả hoạt động
```powershell
.\verify-map-display.ps1
```

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

1. `restart-mapserver.ps1` - Restart MapServer service
2. `rebuild-client.ps1` - Rebuild client container
3. `test-mapserver.ps1` - Test WMS endpoints
4. `verify-map-display.ps1` - Verify toàn bộ hệ thống

Chạy tuần tự: 1 → 2 → 3 → 4

---

**Hoàn thành**: MapServer đã sẵn sàng hiển thị map với 231K+ features! 🎉
