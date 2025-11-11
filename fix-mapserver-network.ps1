# Fix MapServer network connectivity issues on Windows Docker
# Resolves: MapServer cannot connect to admin-postgis

Write-Host ""
Write-Host "=== FIX MAPSERVER NETWORK CONNECTIVITY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will fix Docker network issues between MapServer and PostGIS" -ForegroundColor Yellow
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Check current network setup
Write-Host "[1/6] Checking Docker networks..." -ForegroundColor Yellow
$networks = docker network ls --format "{{.Name}}" | Select-String -Pattern "dubaomatrung"

if ($networks) {
    Write-Host "  Found networks:" -ForegroundColor Gray
    $networks | ForEach-Object {
        Write-Host "    - $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARNING] No custom networks found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/6] Inspecting container network connections..." -ForegroundColor Yellow

# Check MapServer network
$mapserverNet = docker inspect dubaomatrung-mapserver --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>&1
Write-Host "  MapServer network: $mapserverNet" -ForegroundColor Gray

# Check PostGIS network
$postgisNet = docker inspect dubaomatrung-admin-postgis --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>&1
Write-Host "  PostGIS network: $postgisNet" -ForegroundColor Gray

if ($mapserverNet -eq $postgisNet) {
    Write-Host "  [OK] Containers on same network: $mapserverNet" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Containers on DIFFERENT networks!" -ForegroundColor Red
    Write-Host "    MapServer: $mapserverNet" -ForegroundColor Red
    Write-Host "    PostGIS: $postgisNet" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/6] Testing DNS resolution..." -ForegroundColor Yellow

# Test if MapServer can resolve admin-postgis hostname
$dnsTest = docker exec dubaomatrung-mapserver nslookup admin-postgis 2>&1

if ($dnsTest -match "Address" -or $dnsTest -match "can't resolve") {
    if ($dnsTest -match "can't resolve") {
        Write-Host "  [ERROR] DNS resolution failed!" -ForegroundColor Red
        Write-Host "  MapServer cannot resolve 'admin-postgis' hostname" -ForegroundColor Red
        $needsNetworkFix = $true
    } else {
        Write-Host "  [OK] DNS resolution working" -ForegroundColor Green
        $needsNetworkFix = $false
    }
} else {
    Write-Host "  [WARNING] DNS test inconclusive" -ForegroundColor Yellow
    $needsNetworkFix = $true
}

Write-Host ""
Write-Host "[4/6] Checking PostGIS accessibility..." -ForegroundColor Yellow

# Try to connect to PostGIS port
$portTest = docker exec dubaomatrung-mapserver sh -c "timeout 2 nc -zv admin-postgis 5432" 2>&1

if ($portTest -match "open" -or $portTest -match "succeeded") {
    Write-Host "  [OK] PostGIS port 5432 is accessible" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Cannot reach PostGIS port 5432" -ForegroundColor Red
    Write-Host "  Test result: $portTest" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[5/6] Applying network fix..." -ForegroundColor Yellow

if ($needsNetworkFix) {
    Write-Host "  Network fix is needed. Reconnecting containers..." -ForegroundColor Yellow
    Write-Host ""

    # Get the network name
    $defaultNetwork = "dubaomatrung_default"

    # Check if network exists
    $networkExists = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$defaultNetwork$"

    if (-not $networkExists) {
        Write-Host "  Creating network: $defaultNetwork" -ForegroundColor Yellow
        docker network create $defaultNetwork
    }

    Write-Host "  Reconnecting MapServer to network..." -ForegroundColor Yellow

    # Disconnect from old network (if any)
    docker network disconnect $mapserverNet dubaomatrung-mapserver 2>$null

    # Connect to correct network
    docker network connect $defaultNetwork dubaomatrung-mapserver

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] MapServer reconnected" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Failed to reconnect MapServer" -ForegroundColor Red
    }

    # Wait for network to stabilize
    Write-Host "  Waiting for network to stabilize..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

} else {
    Write-Host "  [SKIP] Network appears to be configured correctly" -ForegroundColor Green
}

Write-Host ""
Write-Host "[6/6] Verifying fix..." -ForegroundColor Yellow

# Re-test connectivity
$verifyPing = docker exec dubaomatrung-mapserver ping -c 2 admin-postgis 2>&1

if ($verifyPing -match "bytes from" -or $verifyPing -match "received") {
    Write-Host "  [OK] Ping test successful" -ForegroundColor Green

    # Test port again
    $verifyPort = docker exec dubaomatrung-mapserver sh -c "nc -zv admin-postgis 5432" 2>&1

    if ($verifyPort -match "open" -or $verifyPort -match "succeeded") {
        Write-Host "  [OK] Port 5432 accessible" -ForegroundColor Green
        Write-Host ""
        Write-Host "  [SUCCESS] Network connectivity FIXED! ✅" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Ping works but port not accessible" -ForegroundColor Yellow
        Write-Host "  This might be a firewall or PostGIS issue" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] Still cannot reach admin-postgis" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Advanced fix needed. Try:" -ForegroundColor Yellow
    Write-Host "    docker-compose down" -ForegroundColor Gray
    Write-Host "    docker-compose up -d" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== NETWORK DIAGNOSTIC INFO ===" -ForegroundColor Cyan
Write-Host ""

# Show detailed network info
Write-Host "MapServer IP address:" -ForegroundColor Yellow
docker inspect dubaomatrung-mapserver --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}: {{$v.IPAddress}}{{"\n"}}{{end}}'

Write-Host ""
Write-Host "PostGIS IP address:" -ForegroundColor Yellow
docker inspect dubaomatrung-admin-postgis --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}: {{$v.IPAddress}}{{"\n"}}{{end}}'

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Test WMS endpoints again:" -ForegroundColor White
Write-Host "   .\test-mapserver.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. If still not working, restart services:" -ForegroundColor White
Write-Host "   docker-compose restart mapserver-service admin-postgis" -ForegroundColor Gray
Write-Host ""
Write-Host "3. If still failing, full restart:" -ForegroundColor White
Write-Host "   docker-compose down && docker-compose up -d" -ForegroundColor Gray
Write-Host ""
