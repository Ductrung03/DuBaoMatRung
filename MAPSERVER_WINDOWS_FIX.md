# Fix MapServer 500 Error trên Windows Server

## Vấn đề
MapServer service đang trả về lỗi 500 vì:
1. Đường dẫn MapServer binary hard-code theo Linux (`/usr/bin/mapserv`)
2. Không tìm thấy MapServer executable trên Windows

## Giải pháp

### 1. Cài đặt MS4W (MapServer for Windows)

```cmd
# Download MS4W từ https://ms4w.com/
# Giải nén vào C:\ms4w\
# Kiểm tra file mapserv.exe tồn tại tại: C:\ms4w\Apache\cgi-bin\mapserv.exe
```

### 2. Cấu hình `.env` cho MapServer Service

Tạo/cập nhật file `.env` trong `microservices/services/mapserver-service/`:

```env
# MapServer Service Environment

NODE_ENV=production
PORT=3008

# MapServer for Windows
MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles\laocai.map
```

**Lưu ý quan trọng:**
- Đường dẫn Windows phải dùng `\` hoặc `\\`
- Đảm bảo file `laocai.map` tồn tại tại đường dẫn chỉ định
- MapFile cũng cần cập nhật các đường dẫn database connection

### 3. Cập nhật MapFile cho Windows

Sửa file `mapserver/mapfiles/laocai.map`:

```mapfile
MAP
  NAME "LaoCai_GIS"
  STATUS ON
  SIZE 800 600
  EXTENT 103.5 21.8 104.5 23.0
  UNITS DD
  SHAPEPATH "C:/DuBaoMatRung/mapserver/shapefiles"
  IMAGECOLOR 255 255 255

  WEB
    METADATA
      "wms_title"           "Lao Cai GIS Services"
      "wms_onlineresource"  "http://103.56.160.66:8080/api/mapserver?"
      "wms_srs"             "EPSG:4326 EPSG:3857 EPSG:32648"
      "wms_enable_request"  "*"
    END
    IMAGEPATH "C:/DuBaoMatRung/mapserver/tmp/"
    IMAGEURL "/tmp/"
  END

  PROJECTION
    "init=epsg:4326"
  END

  # Các layers với PostgreSQL connection
  LAYER
    NAME "ranhgioihc"
    TYPE LINE
    STATUS ON
    CONNECTIONTYPE POSTGIS
    # Cập nhật connection string cho Windows
    CONNECTION "host=localhost port=5432 dbname=admin_db user=postgres password=YOUR_PASSWORD"
    DATA "geom FROM laocai_ranhgioihc USING UNIQUE gid USING SRID=4326"

    # ... các cấu hình khác
  END

  # Tương tự cho các layer khác
END
```

### 4. Tạo thư mục tạm cho MapServer

```cmd
# Tạo thư mục temp để MapServer lưu ảnh tạm
mkdir C:\DuBaoMatRung\mapserver\tmp
```

### 5. Cấu hình PostgreSQL Connection

Đảm bảo PostgreSQL trên Windows đang chạy và có thể kết nối:

```cmd
# Kiểm tra PostgreSQL service
net start postgresql-x64-15

# Test connection
psql -U postgres -d admin_db -c "SELECT version();"

# Kiểm tra tables MapServer cần
psql -U postgres -d admin_db -c "\dt laocai_*"
```

### 6. Khởi động lại MapServer Service

```cmd
# Nếu dùng PM2
pm2 restart mapserver-service

# Hoặc stop và start lại
pm2 stop mapserver-service
pm2 start ecosystem.config.js --only mapserver-service
```

### 7. Kiểm tra service hoạt động

```cmd
# Test health check
curl http://localhost:3008/health

# Test WMS GetCapabilities
curl "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

# Test qua Gateway
curl "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

# Test từ bên ngoài
curl "http://103.56.160.66:8080/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

## Troubleshooting

### Lỗi: MapServer binary not found

```cmd
# Kiểm tra file tồn tại
dir C:\ms4w\Apache\cgi-bin\mapserv.exe

# Nếu không tồn tại, kiểm tra lại cài đặt MS4W
```

### Lỗi: MapFile not found

```cmd
# Kiểm tra file mapfile
dir C:\DuBaoMatRung\mapserver\mapfiles\laocai.map

# Kiểm tra quyền đọc file
```

### Lỗi: Database connection failed

```cmd
# Kiểm tra PostgreSQL đang chạy
net start postgresql-x64-15

# Kiểm tra port 5432 đang lắng nghe
netstat -ano | findstr :5432

# Test connection string trong MapFile
```

### Lỗi: Permission denied cho thư mục tmp

```cmd
# Cấp quyền đầy đủ cho thư mục tmp
icacls "C:\DuBaoMatRung\mapserver\tmp" /grant Everyone:F /T
```

## Xem logs chi tiết

```cmd
# Xem logs MapServer service
pm2 logs mapserver-service

# Xem logs Gateway (để thấy proxy requests)
pm2 logs gateway

# Xem logs với filter
pm2 logs mapserver-service --lines 100
```

## Code changes đã thực hiện

File `microservices/services/mapserver-service/src/index.js` đã được cập nhật để:
1. Tự động detect Windows platform
2. Sử dụng đường dẫn Windows mặc định cho MS4W
3. Đọc cấu hình từ `.env` nếu có
4. Support cả Linux và Windows

```javascript
// MapServer config - Support both Linux and Windows
const MAPSERV_BIN = process.env.MAPSERV_BIN ||
  (process.platform === 'win32'
    ? 'C:\\ms4w\\Apache\\cgi-bin\\mapserv.exe'
    : '/usr/bin/mapserv');

const MAPFILE_PATH = process.env.MAPFILE_PATH
  ? path.resolve(process.env.MAPFILE_PATH)
  : path.join(__dirname, '../../../..', 'mapserver/mapfiles/laocai.map');
```

## Checklist Deploy

- [ ] Cài đặt MS4W vào `C:\ms4w\`
- [ ] Tạo file `.env` với đường dẫn Windows
- [ ] Cập nhật `laocai.map` với connection string và paths Windows
- [ ] Tạo thư mục `C:\DuBaoMatRung\mapserver\tmp`
- [ ] Kiểm tra PostgreSQL đang chạy và có data
- [ ] Restart mapserver-service
- [ ] Test WMS requests qua browser/curl
- [ ] Kiểm tra frontend hiển thị bản đồ

## Liên hệ

Nếu vẫn gặp lỗi, kiểm tra:
1. PM2 logs: `pm2 logs mapserver-service`
2. PostgreSQL logs
3. Firewall Windows có block port không
4. Đường dẫn trong `.env` có chính xác không

**Good luck, LuckyBoiz! 🚀**
