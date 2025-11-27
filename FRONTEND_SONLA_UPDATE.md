# Frontend Update: Sơn La 3 Layers

## ✅ Files Đã Cập Nhật

### 1. **GeoDataContext** - Core State Management
**File:** `client/src/dashboard/contexts/GeoDataContext.jsx`

**Thay đổi:**
```javascript
// OLD (Lào Cai - 6 layers)
export const MAPSERVER_LAYERS = {
  ADMINISTRATIVE: 'ranhgioihc',
  FOREST_TYPES: 'rg3lr',
  TERRAIN: 'nendiahinh',
  MANAGEMENT: 'chuquanly',
  DISTRICT: 'huyen'
};

const [mapLayers, setMapLayers] = useState({
  administrative: { ... },
  forestManagement: { ... },
  terrain: { ... },
  terrainLine: { ... },
  forestTypes: { ... },
  forestStatus: { ... },
  deforestationAlerts: { ... }
});

// NEW (Sơn La - 3 layers)
export const MAPSERVER_LAYERS = {
  RANH_GIOI_XA: 'ranhgioixa',         // 75 xã
  TIEU_KU_KHOANH: 'tieukukhoanh',     // 30k khoảnh
  HIEN_TRANG_RUNG: 'hientrangrung'    // 280k khoảnh
};

const [mapLayers, setMapLayers] = useState({
  // 3 SƠN LA WMS LAYERS
  ranhgioixa: {
    name: "Ranh Giới Xã",
    layerType: "wms",
    wmsLayer: MAPSERVER_LAYERS.RANH_GIOI_XA,
    visible: true
  },
  tieukukhoanh: {
    name: "Tiểu Khu Khoảnh Lô",
    layerType: "wms",
    wmsLayer: MAPSERVER_LAYERS.TIEU_KU_KHOANH,
    visible: true
  },
  hientrangrung: {
    name: "Hiện Trạng Rừng",
    layerType: "wms",
    wmsLayer: MAPSERVER_LAYERS.HIEN_TRANG_RUNG,
    visible: true
  },
  // Optional: Deforestation alerts (GeoJSON)
  deforestationAlerts: {
    name: "Dự báo mất rừng",
    layerType: "geojson",
    visible: false
  }
});
```

---

### 2. **MapServerLayers** - WMS Tile Rendering
**File:** `client/src/dashboard/components/MapServerLayers.jsx`

**Thay đổi:**
- Xóa tất cả 6 WMS layers cũ
- Thêm 3 WMS layers mới cho Sơn La

```javascript
// OLD
{visibleLayers.includes('ranhgioihc') && <WMSTileLayer ... />}
{visibleLayers.includes('rg3lr') && <WMSTileLayer ... />}
{visibleLayers.includes('nendiahinh') && <WMSTileLayer ... />}
{visibleLayers.includes('chuquanly') && <WMSTileLayer ... />}
{visibleLayers.includes('huyen') && <WMSTileLayer ... />}
{visibleLayers.includes('nendiahinh_line') && <WMSTileLayer ... />}
{visibleLayers.includes('hientrangrung') && <WMSTileLayer ... />}

// NEW - SƠN LA 3 LAYERS
{visibleLayers.includes('ranhgioixa') && <WMSTileLayer ... />}
{visibleLayers.includes('tieukukhoanh') && <WMSTileLayer ... />}
{visibleLayers.includes('hientrangrung') && <WMSTileLayer ... />}
```

---

### 3. **MapLayers** - Layer Rendering Logic
**File:** `client/src/dashboard/pages/Map/components/MapLayers.jsx`

**Thay đổi:**
```javascript
// OLD
<MapServerLayers
  visibleLayers={[
    mapLayers.terrain?.visible && 'nendiahinh',
    mapLayers.terrainLine?.visible !== false && 'nendiahinh_line',
    mapLayers.forestManagement?.visible && 'chuquanly',
    mapLayers.forestTypes?.visible && 'rg3lr',
    mapLayers.forestStatus?.visible !== false && 'hientrangrung',
    mapLayers.administrative?.visible && 'ranhgioihc'
  ].filter(Boolean)}
/>

// NEW - SƠN LA
<MapServerLayers
  visibleLayers={[
    mapLayers.ranhgioixa?.visible !== false && 'ranhgioixa',
    mapLayers.tieukukhoanh?.visible !== false && 'tieukukhoanh',
    mapLayers.hientrangrung?.visible !== false && 'hientrangrung'
  ].filter(Boolean)}
/>
```

---

### 4. **MapLayerLegend** - Legend UI
**File:** `client/src/dashboard/components/MapLayerLegend.jsx`

**Thay đổi:**
- Xóa 6 legend items cũ
- Thêm 3 legend items mới cho Sơn La
- Cập nhật phân loại hiện trạng rừng theo `ldlr_23`

```javascript
// OLD
layer-ranhgioihc (Ranh giới hành chính)
layer-rg3lr (3 Loại rừng)
layer-nendiahinh-line (Địa hình, thủy văn)
layer-chuquanly (Chủ quản lý)
layer-hientrangrung (Hiện trạng rừng)
layer-deforestation (Dự báo mất rừng)

// NEW
layer-ranhgioixa (Ranh Giới Xã - 75 xã)
layer-tieukukhoanh (Tiểu Khu Khoảnh Lô - 30k)
layer-hientrangrung (Hiện Trạng Rừng - 280k)

// Layer Mapping (Event Listeners)
const layerMapping = {
  'layer-ranhgioixa': 'ranhgioixa',
  'layer-tieukukhoanh': 'tieukukhoanh',
  'layer-hientrangrung': 'hientrangrung'
};
```

**Hiện Trạng Rừng - Chi Tiết Phân Loại:**
- 🌲 Rừng giàu: HG1, HG2, HGD
- 🌱 Rừng trồng: RTG, RTN, RTK, TXG, TXN, TXK
- 🏜️ Đất trống: DT1, DT2, DTR, DNN
- 🌾 Lúa & Khác: LKG, LKN, LKK, DKH

---

### 5. **CapNhatDuLieu** - Data Management Sidebar
**File:** `client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx`

**Thay đổi:**
```javascript
// OLD
{layerKey === 'administrative' && '🏛️'}
{layerKey === 'forestTypes' && '🌲'}
{layerKey === 'forestManagement' && '🏢'}
{layerKey === 'terrain' && '🏔️'}
{layerKey === 'terrainLine' && '🗺️'}
{layerKey === 'forestStatus' && '🌳'}
{layerKey === 'deforestationAlerts' && '⚠️'}

// NEW
{layerKey === 'ranhgioixa' && '🏘️'}
{layerKey === 'tieukukhoanh' && '📐'}
{layerKey === 'hientrangrung' && '🌳'}
{layerKey === 'deforestationAlerts' && '⚠️'}
```

---

## 🎨 UI Changes Summary

### Legend Display
**Trước (6 items):**
1. 👁️ Lớp ranh giới hành chính
2. 🌲 Lớp ranh giới 3 loại rừng
3. 🏔️ Lớp địa hình, thủy văn, giao thông
4. 🏢 Lớp ranh giới chủ quản lý rừng
5. 🌳 Lớp hiện trạng rừng
6. ⚠️ Lớp dự báo mất rừng mới nhất

**Sau (3 items):**
1. 🏘️ **Ranh Giới Xã** (75 xã)
2. 📐 **Tiểu Khu Khoảnh Lô** (30k khoảnh)
3. 🌳 **Hiện Trạng Rừng** (280k khoảnh) - với 20+ loại đất phân loại chi tiết

### Sidebar - Cập Nhật Dữ Liệu
**Trước:**
- 🏛️ Ranh giới hành chính [WMS]
- 🌲 Các loại rừng (phân loại LDLR) [WMS]
- 🏢 Chủ quản lý rừng [WMS]
- 🏔️ Nền địa hình [WMS]
- 🗺️ Địa hình, thủy văn, giao thông [WMS]
- 🌳 Hiện trạng rừng [WMS]
- ⚠️ Dự báo mất rừng mới nhất [GeoJSON]

**Sau:**
- 🏘️ Ranh Giới Xã [WMS]
- 📐 Tiểu Khu Khoảnh Lô [WMS]
- 🌳 Hiện Trạng Rừng [WMS]
- ⚠️ Dự báo mất rừng mới nhất [GeoJSON] (optional)

---

## 🔌 API Integration

### Layer Endpoints
```javascript
// WMS Layers (auto-rendered via MapServer)
GET /api/mapserver?LAYERS=ranhgioixa&...
GET /api/mapserver?LAYERS=tieukukhoanh&...
GET /api/mapserver?LAYERS=hientrangrung&...

// GeoJSON Layers (load từ API)
GET /api/layer-data/deforestation-alerts?days=90
GET /api/mat-rung?limit=1000
```

---

## ✅ Testing Checklist

### Map Display
- [ ] Mở trang Bản đồ
- [ ] Kiểm tra 3 lớp WMS hiển thị:
  - [ ] Ranh giới xã (viền đen, fill nhạt)
  - [ ] Tiểu khu khoảnh lô (viền xám, fill nhạt)
  - [ ] Hiện trạng rừng (màu sắc theo ldlr_23)
- [ ] Zoom in/out mượt mà
- [ ] No console errors

### Legend
- [ ] Legend hiển thị 3 items
- [ ] Checkbox toggle hoạt động
- [ ] Màu sắc match với map
- [ ] Có thể thu gọn/mở rộng
- [ ] Phân loại hiện trạng rừng đầy đủ (20+ loại)

### Sidebar - Quản Lý Dữ Liệu
- [ ] Sidebar hiển thị 3 lớp WMS
- [ ] Icon đúng cho từng lớp
- [ ] Badge "WMS" hiển thị đúng
- [ ] Nút "👁️ Hiển thị" / "🙈 Ẩn" hoạt động
- [ ] Loading state hiển thị khi toggle

### Performance
- [ ] Map load < 2s
- [ ] Tile rendering mượt
- [ ] No lag khi zoom
- [ ] Memory usage stable

---

## 🐛 Troubleshooting

### Map không hiển thị layers
```bash
# 1. Check MapServer
curl "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

# 2. Check mapfile
tail -f /home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/logs/mapserver.log

# 3. Check frontend console
# Mở DevTools → Console → Filter "WMS" or "MapServer"
```

### Legend không cập nhật
```javascript
// Check mapLayers state trong console
console.log(mapLayers);

// Expected output:
{
  ranhgioixa: { visible: true, layerType: "wms", ... },
  tieukukhoanh: { visible: true, layerType: "wms", ... },
  hientrangrung: { visible: true, layerType: "wms", ... }
}
```

### Toggle không hoạt động
```javascript
// Check event listeners
// Trong MapLayerLegend.jsx, line 422-426
const layerMapping = {
  'layer-ranhgioixa': 'ranhgioixa',
  'layer-tieukukhoanh': 'tieukukhoanh',
  'layer-hientrangrung': 'hientrangrung'
};
```

---

## 📝 Migration Notes

### Breaking Changes
- ❌ **Removed 6 old layers:** administrative, forestTypes, forestManagement, terrain, terrainLine, forestStatus (Lào Cai)
- ✅ **Added 3 new layers:** ranhgioixa, tieukukhoanh, hientrangrung (Sơn La)
- ⚠️ **mapLayers keys changed:** Code using old keys will break

### Backward Compatibility
- ✅ GeoJSON layer `deforestationAlerts` giữ nguyên
- ✅ Map interaction logic không thay đổi
- ✅ Popup/tooltip builder không thay đổi

### Data Migration
- Database: Đã migrate từ Lào Cai → Sơn La
- MapServer: Đã cập nhật mapfile
- Backend API: Đã cập nhật endpoints
- Frontend: Hoàn thành ✅

---

**Last Updated:** 2025-11-25
**Status:** ✅ Complete
**Tested:** Pending user verification
