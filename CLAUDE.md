# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng Quan Dự Án

**DuBaoMatRung** (Hệ thống Phát hiện sớm và Dự báo Mất Rừng) - Ứng dụng GIS dựa trên kiến trúc microservices để giám sát và dự báo mất rừng tại Lao Cai, Việt Nam. Hệ thống tích hợp MapServer để render dữ liệu không gian địa lý lớn với hiệu suất cao và cung cấp khả năng giám sát rừng theo thời gian thực.

## Kiến Trúc Hệ Thống

### Cấu Trúc Dự Án

Đây là **monorepo** với 2 workspace chính:
- `client/` - Frontend React + Vite với bản đồ Leaflet
- `microservices/` - Backend microservices Node.js

### Kiến Trúc Microservices

Backend sử dụng mô hình microservices với:

**Gateway (Port 3000)**
- API Gateway sử dụng `http-proxy-middleware`
- Định tuyến request tới các service phù hợp
- Xử lý CORS, rate limiting, authentication
- Tài liệu Swagger tại `/api-docs`

**Các Service Chính:**
- `auth-service` (Port 3001) - Xác thực & quản lý JWT token
- `user-service` (Port 3002) - Quản lý người dùng
- `gis-service` (Port 3003) - Xử lý dữ liệu GIS, truy vấn PostGIS, dự báo mất rừng
- `report-service` (Port 3004) - Tạo báo cáo
- `admin-service` (Port 3005) - Dữ liệu ranh giới hành chính, dropdown data
- `search-service` (Port 3006) - Chức năng tìm kiếm
- `mapserver-service` - Service tích hợp MapServer

**Thư Viện Dùng Chung** (`microservices/shared/`):
- `database/` - Quản lý connection pool PostgreSQL
- `redis/` - Quản lý cache Redis với pattern-based operations
- `logger/` - Winston logger với file rotation
- `errors/` - Xử lý lỗi tập trung
- `swagger/` - Cấu hình tài liệu Swagger
- `event-bus/` - Hệ thống event cho giao tiếp giữa các service
- `tracing/` - Hỗ trợ distributed tracing
- `validators/` - Schema validation dùng chung

### Kiến Trúc Dữ Liệu

**Databases:**
- PostgreSQL chính (Port 5432) - Dữ liệu ứng dụng (`dubaomatrung`)
- PostgreSQL admin (Port 5433) - Ranh giới hành chính (`admin_db`)
  - Chứa dataset không gian địa lý lớn (231K+ bản ghi loại rừng)
  - Tables: `laocai_rg3lr`, `laocai_chuquanly`, `laocai_ranhgioihc`, `laocai_nendiahinh`

**Caching:**
- Redis (Port 6379) - Cache dữ liệu GIS, lưu trữ session

**Tích Hợp MapServer:**
- MapServer 8.4.1 phục vụ WMS tiles trên port 8090
- Nginx + fcgiwrap cho CGI processing
- Vị trí mapfile: `mapserver/mapfiles/laocai.map`
- Cải thiện hiệu suất 250x cho các layer tĩnh lớn
- Xem `MAPSERVER_INTEGRATION_COMPLETE.md` để biết chi tiết

### Kiến Trúc Frontend

**Stack Công Nghệ:**
- React 19 với Vite build system
- React Router cho navigation
- Leaflet + react-leaflet cho bản đồ
- Axios cho giao tiếp API
- TailwindCSS cho styling

**Context Chính:**
- `GeoDataContext` - Quản lý state trung tâm cho các layer GIS và dữ liệu mất rừng
  - Tự động load tất cả các layer khi khởi động (hành chính, quản lý rừng, địa hình, loại rừng)
  - Hỗ trợ cả GeoJSON API layers và WMS layers
  - Cung cấp viewport-based data loading cho dataset lớn
  - Constants: `MAPSERVER_LAYERS`, `WMS_BASE_URL`

**Kiến Trúc Bản Đồ:**
- Static layers (ranh giới hành chính, loại rừng) được phục vụ qua MapServer WMS
- Dynamic layers (dự báo mất rừng) được load dạng GeoJSON từ API
- Chiến lược load layer thông minh để tránh quá tải browser

## Lệnh Development

### Development Full Stack

```bash
# Khởi động tất cả services (backend + frontend)
npm run dev

# Chỉ khởi động backend
npm run dev:backend

# Chỉ khởi động frontend
npm run dev:frontend

# Build toàn bộ
npm run build
```

### Development Service Riêng Lẻ

```bash
# Gateway
cd microservices/gateway && npm run dev

# Bất kỳ microservice nào
cd microservices/services/<service-name> && npm run dev

# Frontend
cd client && npm run dev
```

### Lệnh Frontend

```bash
cd client

# Development server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Testing

```bash
# Chạy tất cả tests
npm test

# Integration tests
cd microservices/tests && npm test

# Load tests
cd microservices/load-tests && npm test
```

## Cấu Hình

### Biến Môi Trường

Mỗi microservice cần file `.env`. Các biến chính:

**Database:**
```
DB_HOST=localhost
DB_PORT=5432 (hoặc 5433 cho admin_db)
DB_USER=postgres
DB_PASSWORD=<password>
DB_NAME=dubaomatrung (hoặc admin_db)
```

**Redis:**
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

**JWT:**
```
JWT_SECRET=<secret_key>
```

**Service URLs** (Gateway):
```
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GIS_SERVICE_URL=http://localhost:3003
REPORT_SERVICE_URL=http://localhost:3004
ADMIN_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3006
```

### Cấu Hình Proxy Frontend

Frontend sử dụng Vite proxy để định tuyến API request trong development. Tất cả `/api/*` requests được proxy tới Gateway (port 3000), Gateway sau đó định tuyến tới các service phù hợp. Xem `client/vite.config.js` và `microservices/gateway/src/index.js` để biết chi tiết cấu hình proxy.

## Pattern & Quy Ước Quan Trọng

### Sử Dụng Shared Library

Tất cả microservices nên sử dụng shared libraries để đảm bảo tính nhất quán:

```javascript
const DatabaseManager = require('../../../shared/database');
const RedisManager = require('../../../shared/redis');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
```

### Database Manager

```javascript
// Khởi tạo
dbManager = new DatabaseManager('service-name', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});
await dbManager.initialize();

// Sử dụng
const result = await dbManager.query('SELECT * FROM table WHERE id = $1', [id]);
```

### Redis Manager

```javascript
// Khởi tạo
redisManager = new RedisManager('service-name', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});
await redisManager.initialize();

// Sử dụng với patterns
await redisManager.setWithPattern('user:123', userData, 3600);
const cached = await redisManager.getWithPattern('user:123');
```

### Logging

```javascript
const logger = createLogger('service-name');

logger.info('Message', { metadata });
logger.error('Error message', { error: error.message });
logger.debug('Debug info');
```

### Xử Lý Lỗi

Tất cả services sử dụng error handler middleware tập trung:

```javascript
app.use(errorHandler(logger));
```

## Các Lưu Ý Đặc Biệt Về GIS

### Xử Lý Dataset Lớn

Hệ thống xử lý các dataset không gian địa lý cực lớn:
- Layer loại rừng: 231,963 features (~50MB GeoJSON)
- Chủ quản lý rừng: 28,997 features (~8MB)

**Chiến Lược Tối Ưu Hiệu Suất:**
1. **MapServer WMS** cho static layers (ranh giới hành chính, loại rừng)
2. **Viewport-based loading** cho interactive GeoJSON layers
3. **Redis caching** với TTL cho dữ liệu truy cập thường xuyên
4. **Auto-load tất cả layer thiết yếu** - layer lớn như `forestTypes` được phục vụ qua MapServer WMS để đảm bảo hiệu suất

### Sử Dụng MapServer WMS

```javascript
// Trong React components
import { MAPSERVER_LAYERS, WMS_BASE_URL } from '../contexts/GeoDataContext';

// Sử dụng WMSTileLayer từ react-leaflet
<WMSTileLayer
  url={WMS_BASE_URL}
  layers={MAPSERVER_LAYERS.FOREST_TYPES}
  format="image/png"
  transparent={true}
/>
```

### Các Function Trong GeoDataContext

Các function chính có sẵn trong GeoDataContext:

- `loadSingleLayer(layerKey)` - Load dữ liệu layer riêng lẻ
- `updateLayerData(layerName, data)` - Cập nhật dữ liệu layer
- `toggleLayerVisibility(layerName)` - Hiện/ẩn layer
- `loadAutoForecastData(year, month, period)` - Load dự báo theo thời gian
- `resetToDefaultData()` - Reset về chế độ xem mặc định 3 tháng
- `getCurrentDataInfo()` - Lấy metadata về dữ liệu hiện tại

## Giao Tiếp Giữa Các Service   

Các service được cô lập và giao tiếp thông qua:
1. **HTTP API calls** - Qua gateway proxy
2. **Event Bus** - Cho async events (xem `shared/event-bus/`)
3. **Redis pub/sub** - Cho cập nhật real-time

## Vị Trí Database Schema

- `microservices/database/schemas/` - Định nghĩa database schema
- `microservices/database/migrations/` - Script migration
- `microservices/database/seeds/` - Dữ liệu seed

## Cấu Hình MapServer

MapServer được cấu hình riêng biệt với Node.js services:
- **Nginx config:** `/etc/nginx/conf.d/mapserver.conf`
- **Mapfile:** `mapserver/mapfiles/laocai.map`
- **Endpoint:** `http://localhost:8090/mapserver`

Để test MapServer:
```bash
curl 'http://localhost:8090/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities'
```

## Lưu Ý Quan Trọng

- Tất cả API requests từ frontend đều đi qua Gateway (port 3000) tuân thủ kiến trúc microservices
- MapServer WMS được phục vụ qua route `/api/mapserver` của Gateway
- Hành vi auto-load: Hệ thống load tự động tất cả các layer khi khởi động bao gồm:
  - Layer hành chính (ranh giới hành chính)
  - Layer quản lý rừng (chủ quản lý)
  - Layer địa hình (nền địa hình)
  - Layer loại rừng (231K features - được phục vụ qua MapServer WMS để đảm bảo hiệu suất)
  - Dữ liệu dự báo mất rừng 3 tháng
- Xác thực sử dụng JWT tokens lưu trong localStorage

## Yêu Cầu Node & npm

- Node.js >= 18.0.0
- npm >= 9.0.0
