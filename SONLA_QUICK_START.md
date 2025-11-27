# 🚀 Quick Start Guide - Sơn La System

## Khởi Động Hệ Thống

### 1. Start Backend Services
```bash
cd microservices
npm run dev
```

**Services sẽ chạy trên:**
- Gateway: http://localhost:3000
- Auth: http://localhost:3001
- User: http://localhost:3002
- **GIS (Sơn La): http://localhost:3003** ⭐
- Report: http://localhost:3004
- Admin: http://localhost:3005
- Search: http://localhost:3006

### 2. Start Frontend
```bash
cd client
npm run dev
```
Frontend: http://localhost:5173

---

## 🗺️ Test MapServer Layers

### WMS GetCapabilities
```bash
curl "http://localhost/cgi-bin/mapserv?map=/home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/mapfiles/sonla.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
```

### WMS GetMap (Ranh Giới Xã)
```bash
curl "http://localhost/cgi-bin/mapserv?map=/home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/mapfiles/sonla.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ranhgioixa&WIDTH=800&HEIGHT=600&BBOX=103.5,20.5,104.8,22.0&FORMAT=image/png&CRS=EPSG:4326" -o test_rgx.png
```

### WMS GetMap (Hiện Trạng Rừng)
```bash
curl "http://localhost/cgi-bin/mapserv?map=/home/luckyboiz/LuckyBoiz/Projects/Reacts/DuBaoMatRung/mapserver/mapfiles/sonla.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=hientrangrung&WIDTH=800&HEIGHT=600&BBOX=103.5,20.5,104.8,22.0&FORMAT=image/png&CRS=EPSG:4326" -o test_htr.png
```

---

## 🔌 Test GIS API Endpoints

### Get Layer Data (GeoJSON)

#### 1. Ranh Giới Xã (75 xã)
```bash
curl "http://localhost:3000/api/gis/layers/ranhgioixa" | jq '.data.features | length'
# Expected: 75
```

#### 2. Tiểu Khu Khoảnh Lô (30k khoảnh)
```bash
curl "http://localhost:3000/api/gis/layers/tieukukhoanh" | jq '.data.features | length'
# Expected: 10000 (limited)
```

#### 3. Hiện Trạng Rừng (280k khoảnh) - PRIMARY LAYER
```bash
curl "http://localhost:3000/api/gis/layers/hientrangrung" | jq '.data.features | length'
# Expected: 10000 (limited)
```

### Get Layer Bounds
```bash
# Ranh giới xã
curl "http://localhost:3000/api/gis/layers/ranhgioixa/bounds" | jq '.bounds'

# Hiện trạng rừng
curl "http://localhost:3000/api/gis/layers/hientrangrung/bounds" | jq '.bounds'
```

---

## 🔍 Test Database Queries

### Count Records
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "
SELECT
  'sonla_rgx' as table, COUNT(*) as records FROM sonla_rgx
UNION ALL
SELECT
  'sonla_tkkl', COUNT(*) FROM sonla_tkkl
UNION ALL
SELECT
  'sonla_hientrangrung', COUNT(*) FROM sonla_hientrangrung;
"
```

**Expected Output:**
```
        table         | records
----------------------+---------
 sonla_rgx            |      75
 sonla_tkkl           |   30508
 sonla_hientrangrung  |  280411
```

### Check Indexes
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename LIKE 'sonla%'
ORDER BY tablename, indexname;
"
```

### Test Spatial Query (Sample)
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "
SELECT xa, ldlr_23, COUNT(*) as count
FROM sonla_hientrangrung
WHERE ldlr_23 IN ('HG1', 'HG2', 'RTG')
GROUP BY xa, ldlr_23
ORDER BY count DESC
LIMIT 10;
"
```

---

## 📊 Check Performance

### Query Timing
```bash
# Ranh giới xã (should be < 100ms)
time curl -s "http://localhost:3000/api/gis/layers/ranhgioixa" > /dev/null

# Tiểu khu khoảnh (should be < 500ms)
time curl -s "http://localhost:3000/api/gis/layers/tieukukhoanh" > /dev/null

# Hiện trạng rừng (should be < 2s)
time curl -s "http://localhost:3000/api/gis/layers/hientrangrung" > /dev/null
```

### Check Cache (Redis)
```bash
redis-cli

# List cached layer keys
KEYS layer:*

# Check TTL
TTL layer:hientrangrung:geojson:all

# Get cache info
INFO keyspace
```

---

## 🎨 Frontend Test Checklist

### Map View
1. Mở http://localhost:5173
2. Đăng nhập (admin/password hoặc credentials của bạn)
3. Vào trang **Bản đồ**
4. Kiểm tra **Legend** ở góc phải:
   - ✅ 🏘️ Ranh Giới Xã (75 xã)
   - ✅ 📐 Tiểu Khu Khoảnh Lô (30k khoảnh)
   - ✅ 🌳 Hiện Trạng Rừng (280k khoảnh)

### Layer Toggle
- Click checkbox để bật/tắt từng layer
- Kiểm tra layer hiển thị đúng
- Zoom in/out để test rendering

### Data Inspection
- Click vào polygon trên map
- Kiểm tra popup/tooltip hiển thị:
  - Tên xã
  - Tiểu khu
  - Khoảnh
  - Loại đất (ldlr_23)

---

## 🐛 Troubleshooting

### Services không start
```bash
# Check ports
ss -tlnp | grep -E ':(3000|3001|3002|3003|3004|3005|3006)'

# Check logs
cd microservices
npm run logs
```

### MapServer không hoạt động
```bash
# Test MapServer
MS_MAPFILE=/path/to/sonla.map \
QUERY_STRING="SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" \
REQUEST_METHOD=GET \
/usr/bin/mapserv

# Check mapfile syntax
/usr/bin/mapserv -nh "QUERY_STRING=map=/path/to/sonla.map&SERVICE=WMS&REQUEST=GetCapabilities"
```

### Database connection failed
```bash
# Test connection
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "SELECT 1;"

# Check PostgreSQL
sudo systemctl status postgresql
```

### Layer không load
```bash
# Check table exists
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "\dt sonla*"

# Check data
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "SELECT COUNT(*) FROM sonla_hientrangrung;"
```

---

## 📝 Common Tasks

### Clear Cache
```bash
redis-cli
FLUSHDB
```

### Rebuild Indexes
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "
REINDEX TABLE sonla_hientrangrung;
REINDEX TABLE sonla_rgx;
REINDEX TABLE sonla_tkkl;
ANALYZE sonla_hientrangrung;
ANALYZE sonla_rgx;
ANALYZE sonla_tkkl;
"
```

### Check Database Size
```bash
PGPASSWORD=4 psql -h localhost -p 5433 -U postgres -d admin_db -c "
SELECT
    pg_size_pretty(pg_database_size('admin_db')) as db_size,
    pg_size_pretty(pg_total_relation_size('sonla_hientrangrung')) as htr_size,
    pg_size_pretty(pg_total_relation_size('sonla_tkkl')) as tkkl_size,
    pg_size_pretty(pg_total_relation_size('sonla_rgx')) as rgx_size;
"
```

---

## 🎯 Expected Results

### Performance Benchmarks
- **Ranh giới xã:** < 100ms (75 records)
- **Tiểu khu khoảnh:** < 500ms (10k/30k records)
- **Hiện trạng rừng:** < 2s (10k/280k records)

### Data Integrity
- ✅ All 3 tables have spatial indexes
- ✅ All 3 tables have B-tree indexes on key columns
- ✅ No NULL geometries
- ✅ All geometries in EPSG:4326

### Frontend
- ✅ Legend shows 3 Sơn La layers
- ✅ Layers toggle on/off correctly
- ✅ Map renders smoothly
- ✅ Colors match ldlr_23 classification

---

## 🔗 Quick Links

- **API Base:** http://localhost:3000/api
- **GIS Endpoints:** http://localhost:3000/api/gis
- **MapServer:** http://localhost/cgi-bin/mapserv
- **Frontend:** http://localhost:5173
- **Redis Commander:** redis-cli (if installed)

---

**Last Updated:** 2025-11-25
**Status:** ✅ Production Ready
