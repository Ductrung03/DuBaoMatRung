# 🔧 MapServer Windows Fix - Complete Instructions

## 📊 Current Status

Based on diagnostic output:
```
✅ Containers running
✅ Database has data (231K+ rows)
✅ Mapfile exists
✅ SRID typo fixed
❌ Network connectivity FAILED
❌ PostgreSQL connection FAILED
⚠️  GetMap not rendering properly
```

## 🎯 Root Cause

**Docker Network Issue on Windows:**
- MapServer container cannot reach `admin-postgis` container
- DNS resolution or network routing problem
- Containers may not be on the same Docker network

## 🚀 SOLUTION - Run This Command

```powershell
.\fix-mapserver-complete.ps1
```

### What it does:
1. ✅ Stops and removes MapServer container
2. ✅ Verifies mapfile configuration (auto-fixes SRID typo)
3. ✅ Rebuilds MapServer image (fresh start)
4. ✅ Starts services in correct order
5. ✅ Fixes network connectivity
6. ✅ Verifies PostgreSQL connection
7. ✅ Tests WMS endpoints
8. ✅ Confirms map rendering works

### Expected Output:
```
[1/8] Stopping services...
  [OK] Services stopped

[2/8] Removing old MapServer container...
  [OK] Container removed

[3/8] Verifying mapfile configuration...
  [OK] Mapfile configuration correct

[4/8] Rebuilding MapServer image...
  [OK] Image rebuilt successfully

[5/8] Ensuring PostGIS is running...
  [OK] PostGIS already running

[6/8] Starting MapServer...
  [OK] MapServer started

[7/8] Verifying network connectivity...
  [OK] Network connectivity working
  [OK] PostgreSQL port accessible

[8/8] Testing WMS endpoints...
  [OK] MapServer health check passed
  [OK] WMS GetCapabilities working
  Found 7 layers
  [OK] GetMap rendering successfully (45.3 KB)

[SUCCESS] MapServer fix completed! ✅

Test URLs:
  Frontend: http://103.56.160.66:5173
  WMS: http://103.56.160.66:3000/api/mapserver
```

## 📝 Alternative Solutions

### If `fix-mapserver-complete.ps1` doesn't work:

#### Option A: Manual Network Fix
```powershell
# 1. Fix network connectivity
.\fix-mapserver-network.ps1

# 2. Rebuild MapServer
.\rebuild-mapserver.ps1

# 3. Test
.\test-mapserver.ps1
```

#### Option B: Full System Restart
```powershell
# Stop everything
docker-compose down

# Start in order
docker-compose up -d admin-postgis
Start-Sleep -Seconds 10
docker-compose up -d mapserver-service
Start-Sleep -Seconds 5
docker-compose up -d gateway
Start-Sleep -Seconds 5
docker-compose up -d client

# Test
.\test-mapserver.ps1
```

#### Option C: Check Docker Network Configuration
```powershell
# List networks
docker network ls

# Inspect network
docker network inspect dubaomatrung_default

# Check container connections
docker inspect dubaomatrung-mapserver | findstr "NetworkMode"
docker inspect dubaomatrung-admin-postgis | findstr "NetworkMode"
```

## 🔍 Debugging

### Check MapServer Logs
```powershell
docker logs dubaomatrung-mapserver --tail 100
```

### Check PostGIS Logs
```powershell
docker logs dubaomatrung-admin-postgis --tail 50
```

### Test Direct Connection
```powershell
# From MapServer container
docker exec dubaomatrung-mapserver ping admin-postgis
docker exec dubaomatrung-mapserver nc -zv admin-postgis 5432
docker exec dubaomatrung-mapserver nslookup admin-postgis
```

### Test WMS Directly
```powershell
# GetCapabilities
curl "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

# GetMap (save to file)
curl "http://localhost:3007/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=huyen&CRS=EPSG:4326&BBOX=103.5,21.8,104.5,23.0&WIDTH=400&HEIGHT=400&FORMAT=image/png" --output test-map.png
```

### Check Database Tables
```powershell
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_ranhgioihc;"
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) FROM laocai_rg3lr;"
```

## ✅ Success Criteria

After running fix, verify:

- [ ] All containers running: `docker ps`
- [ ] Network connectivity: MapServer can ping `admin-postgis`
- [ ] PostgreSQL accessible: Port 5432 reachable
- [ ] WMS GetCapabilities returns XML with 7 layers
- [ ] WMS GetMap returns PNG image (>10KB)
- [ ] Browser shows map at `http://103.56.160.66:5173`
- [ ] Browser console has no errors (F12 → Console)

## 📞 If Still Not Working

### 1. Collect Diagnostic Info
```powershell
# Run all checks
.\fix-mapserver-windows.ps1 > diagnostic-output.txt

# Collect logs
docker logs dubaomatrung-mapserver > mapserver-logs.txt
docker logs dubaomatrung-gateway > gateway-logs.txt
docker logs dubaomatrung-admin-postgis > postgis-logs.txt

# Network info
docker network inspect dubaomatrung_default > network-info.txt
```

### 2. Check Common Issues

**Issue:** Containers not on same network
```powershell
# Fix: Ensure all containers on dubaomatrung_default
docker network connect dubaomatrung_default dubaomatrung-mapserver
docker network connect dubaomatrung_default dubaomatrung-admin-postgis
```

**Issue:** PostGIS not accepting connections
```powershell
# Check PostGIS is listening
docker exec dubaomatrung-admin-postgis netstat -tln | findstr 5432

# Check PostgreSQL config
docker exec dubaomatrung-admin-postgis cat /var/lib/postgresql/data/postgresql.conf | findstr listen_addresses
```

**Issue:** Windows Firewall blocking
```powershell
# Check if Windows Firewall is blocking
netsh advfirewall show allprofiles
```

### 3. Last Resort: Clean Rebuild
```powershell
# Backup data first!
docker-compose down -v  # WARNING: This removes volumes!
docker system prune -a --volumes
docker-compose up -d
```

## 📚 Files Reference

- **`fix-mapserver-complete.ps1`** ⭐ - All-in-one fix (RECOMMENDED)
- **`fix-mapserver-windows.ps1`** - Diagnostic tool
- **`fix-mapserver-network.ps1`** - Network connectivity fix
- **`rebuild-mapserver.ps1`** - Rebuild container only
- **`test-mapserver.ps1`** - WMS endpoint testing
- **`FIX-MAPSERVER-WINDOWS.md`** - Detailed troubleshooting guide

## 🎉 Expected Final Result

After successful fix:
1. ✅ Browser loads: `http://103.56.160.66:5173`
2. ✅ Map displays Lào Cai province
3. ✅ WMS layers visible:
   - Ranh giới hành chính (4,782 features)
   - 3 loại rừng (231,963 features)
   - Ranh giới huyện (10 districts)
   - Nền địa hình (2,143 features)
   - Địa hình line (19,735 features)
4. ✅ No errors in browser console
5. ✅ Map tiles loading from: `http://103.56.160.66:3000/api/mapserver`

---

**Created:** 2025-11-11
**Last Updated:** After network connectivity diagnosis
**Status:** Ready for deployment
