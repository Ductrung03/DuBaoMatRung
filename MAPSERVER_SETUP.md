# HƯỚNG DẪN TÍCH HỢP MAPSERVER CHO DỮ LIỆU TĨNH

## MỤC TIÊU
Chuyển các layer tĩnh (ranh giới hành chính, quản lý rừng, địa hình) sang MapServer để tăng hiệu suất, giảm tải cho GIS service.

## CÁC BẢNG CẦN SERVE QUA MAPSERVER (trong admin_db)
1. **laocai_ranhgioihc** - 4,782 records (Ranh giới hành chính)
2. **laocai_rg3lr** - 231,963 records (3 loại rừng) ⚠️  DỮ LIỆU LỚN!
3. **laocai_nendiahinh** - 2,143 records (Nền địa hình)
4. **laocai_chuquanly** - 28,997 records (Chủ quản lý rừng)
5. **laocai_huyen** - Records (Ranh giới huyện)

---

## BƯỚC 1: CÀI ĐẶT NGINX VÀ FCGIWRAP

```bash
# Cài Nginx và FastCGI
sudo pacman -S nginx fcgiwrap spawn-fcgi

# Hoặc trên Ubuntu/Debian:
# sudo apt install nginx fcgiwrap spawn-fcgi
```

---

## BƯỚC 2: CẤU HÌNH NGINX ĐỂ SERVE MAPSERVER

Tạo file `/etc/nginx/sites-available/mapserver`:

```nginx
server {
    listen 8080;
    server_name localhost;

    location /mapserver {
        gzip off;

        # FastCGI params
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        include fastcgi_params;

        # MapServer specific
        fastcgi_param SCRIPT_FILENAME /usr/bin/mapserv;
        fastcgi_param MS_MAPFILE /home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/mapfiles/laocai.map;
        fastcgi_param MS_MAP_NO_PATH "1";
        fastcgi_param MS_MAP_PATTERN ".*";

        # Query string
        fastcgi_param QUERY_STRING $query_string;
        fastcgi_param REQUEST_METHOD $request_method;
    }

    # CORS headers
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mapserver /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

---

## BƯỚC 3: KHỞI ĐỘNG FCGIWRAP

```bash
# Start fcgiwrap
sudo systemctl start fcgiwrap
sudo systemctl enable fcgiwrap

# Hoặc dùng spawn-fcgi:
sudo spawn-fcgi -s /var/run/fcgiwrap.socket -f /usr/bin/fcgiwrap
```

---

## BƯỚC 4: TEST MAPSERVER WMS

### Test GetCapabilities:
```bash
curl "http://localhost:8080/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

### Test GetMap (lấy hình ảnh layer):
```bash
curl "http://localhost:8080/mapserver?\
SERVICE=WMS&\
VERSION=1.3.0&\
REQUEST=GetMap&\
LAYERS=ranhgioihc&\
CRS=EPSG:4326&\
BBOX=103.5,21.8,104.5,23.0&\
WIDTH=800&\
HEIGHT=600&\
FORMAT=image/png" > test.png
```

Mở file `test.png` để xem kết quả.

---

## BƯỚC 5: CẬP NHẬT API GATEWAY

Sửa file `microservices/gateway/src/index.js`:

```javascript
// Add MapServer route
app.use('/api/mapserver', createProxyMiddleware({
  target: 'http://localhost:8080',
  pathRewrite: {
    '^/api/mapserver': '/mapserver'
  },
  changeOrigin: true
}));
```

---

## BƯỚC 6: TÍCH HỢP VÀO REACT FRONTEND

### Cài đặt thư viện (nếu chưa có):
```bash
cd client
npm install react-leaflet leaflet
```

### Sử dụng WMS Layer trong React:

```jsx
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';

function MapWithWMS() {
  return (
    <MapContainer center={[22.4, 104.0]} zoom={10}>
      {/* Base map */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* MapServer WMS Layers */}

      {/* Ranh giới hành chính */}
      <WMSTileLayer
        url="http://localhost:3000/api/mapserver"
        params={{
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          LAYERS: 'ranhgioihc',
          FORMAT: 'image/png',
          TRANSPARENT: true
        }}
        layers="ranhgioihc"
        format="image/png"
        transparent={true}
      />

      {/* 3 Loại rừng */}
      <WMSTileLayer
        url="http://localhost:3000/api/mapserver"
        params={{
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          LAYERS: 'rg3lr',
          FORMAT: 'image/png',
          TRANSPARENT: true
        }}
        layers="rg3lr"
        format="image/png"
        transparent={true}
      />

      {/* Nền địa hình */}
      <WMSTileLayer
        url="http://localhost:3000/api/mapserver"
        params={{
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          LAYERS: 'nendiahinh',
          FORMAT: 'image/png',
          TRANSPARENT: true
        }}
        layers="nendiahinh"
        format="image/png"
        transparent={true}
      />

      {/* Chủ quản lý */}
      <WMSTileLayer
        url="http://localhost:3000/api/mapserver"
        params={{
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          LAYERS: 'chuquanly',
          FORMAT: 'image/png',
          TRANSPARENT: true
        }}
        layers="chuquanly"
        format="image/png"
        transparent={true}
      />
    </MapContainer>
  );
}
```

---

## BƯỚC 7: CẬP NHẬT GIS SERVICE

GIS service giờ chỉ cần serve dữ liệu động (mat_rung). Cập nhật `microservices/services/gis-service/src/controllers/layer.controller.js`:

```javascript
// Chỉ giữ lại handler cho mat_rung (dữ liệu động)
exports.getLayerDataByPath = async (req, res, next) => {
  try {
    const { layerName } = req.params;

    // Chỉ serve dữ liệu động
    if (layerName !== 'deforestation-alerts' && layerName !== 'matrung') {
      return res.status(400).json({
        success: false,
        message: `Layer ${layerName} được serve qua MapServer. Vui lòng sử dụng WMS endpoint.`,
        wmsUrl: `http://localhost:3000/api/mapserver?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layerName}`
      });
    }

    // Phần còn lại giữ nguyên cho mat_rung
    // ...
  }
};
```

---

## CÁC LAYERS VÀ MÀU SẮC

### Layer: ranhgioihc (Ranh giới hành chính)
- **Màu viền**: Đỏ (#FF0000)
- **Màu nền**: Đỏ nhạt (#FFC8C8) - opacity 30%
- **Độ dày viền**: 2px

### Layer: rg3lr (3 Loại rừng)
- **Rừng đặc dụng** (maldlr=1): Xanh lá đậm (#008000)
- **Rừng phòng hộ** (maldlr=2): Cam (#FFA500)
- **Rừng sản xuất** (maldlr=3): Xanh lá nhạt (#90EE90)
- **Khác**: Xám (#C8C8C8)

### Layer: nendiahinh (Nền địa hình)
- **Màu nền**: Vàng nâu (#F5DEB3)
- **Màu viền**: Nâu (#8B4513)

### Layer: chuquanly (Chủ quản lý)
- **Màu nền**: Xanh dương nhạt (#87CEEB)
- **Màu viền**: Xanh dương đậm (#4682B4)

---

## KIỂM TRA VÀ DEBUG

### 1. Kiểm tra MapServer hoạt động:
```bash
mapserv -v  # Check version
```

### 2. Kiểm tra mapfile syntax:
```bash
shp2img -m /path/to/laocai.map -o test.png -l ranhgioihc
```

### 3. Xem MapServer logs:
```bash
tail -f /home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/logs/mapserver.log
```

### 4. Test database connection:
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_rg3lr;"
```

---

## TROUBLESHOOTING

### Lỗi "Unable to access file"
- Kiểm tra quyền file mapfile
- Set `MS_MAP_NO_PATH=1` và `MS_MAP_PATTERN=.*`

### Lỗi database connection
- Kiểm tra PostgreSQL đang chạy
- Verify connection string trong mapfile

### WMS trả về blank image
- Kiểm tra BBOX đúng với extent của dữ liệu
- Verify projection (EPSG:4326)
- Check database có dữ liệu không

### Performance issues
- Enable caching trong Nginx
- Use geom_simplified thay vì geom cho zoom level thấp
- Tạo spatial indexes:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_rg3lr_geom_gist ON laocai_rg3lr USING GIST(geom);
  ```

---

## HIỆU SUẤT DỰ KIẾN

| Layer | Records | Old (GeoJSON) | New (WMS) | Improvement |
|-------|---------|--------------|-----------|-------------|
| rg3lr | 231,963 | ~50MB | ~200KB | **250x** |
| chuquanly | 28,997 | ~8MB | ~150KB | **53x** |
| ranhgioihc | 4,782 | ~2MB | ~100KB | **20x** |
| nendiahinh | 2,143 | ~1MB | ~80KB | **12x** |

---

## KẾT LUẬN

Sau khi hoàn thành:
- ✅ Dữ liệu tĩnh (ranh giới, rừng, địa hình) → **MapServer WMS**
- ✅ Dữ liệu động (mất rừng) → **GIS Service API**
- ✅ Hiệu suất tăng **20-250 lần**
- ✅ Giảm tải cho Node.js services
- ✅ Dễ scale và cache

Chúc bạn thành công! 🎉
