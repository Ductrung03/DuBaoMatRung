# Verify Map Display - Final Check
# This script verifies all components are working correctly

Write-Host ""
Write-Host "=== VERIFY MAP DISPLAY ===" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP = "103.56.160.66"
$GATEWAY_IP = "103.56.160.66"

# Test 1: Check client is running
Write-Host "[1/6] Checking client container..." -ForegroundColor Yellow

$clientRunning = docker ps -q -f name=dubaomatrung-client
if ($clientRunning) {
    Write-Host "  [OK] Client container is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Client container is not running!" -ForegroundColor Red
    Write-Host "  Run: docker-compose up -d client" -ForegroundColor Gray
    exit 1
}

# Test 2: Check MapServer is running
Write-Host ""
Write-Host "[2/6] Checking MapServer container..." -ForegroundColor Yellow

$mapserverRunning = docker ps -q -f name=dubaomatrung-mapserver
if ($mapserverRunning) {
    Write-Host "  [OK] MapServer container is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] MapServer container is not running!" -ForegroundColor Red
    Write-Host "  Run: docker-compose up -d mapserver-service" -ForegroundColor Gray
    exit 1
}

# Test 3: Check Gateway is running
Write-Host ""
Write-Host "[3/6] Checking Gateway container..." -ForegroundColor Yellow

$gatewayRunning = docker ps -q -f name=dubaomatrung-gateway
if ($gatewayRunning) {
    Write-Host "  [OK] Gateway container is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Gateway container is not running!" -ForegroundColor Red
    Write-Host "  Run: docker-compose up -d gateway" -ForegroundColor Gray
    exit 1
}

# Test 4: Test Gateway MapServer proxy
Write-Host ""
Write-Host "[4/6] Testing Gateway -> MapServer proxy..." -ForegroundColor Yellow

try {
    $url = "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] Gateway proxy is working" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Unexpected response from Gateway" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Gateway proxy failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

# Test 5: Test external access to Gateway
Write-Host ""
Write-Host "[5/6] Testing external access to Gateway..." -ForegroundColor Yellow

try {
    $url = "http://${GATEWAY_IP}:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop

    if ($response.StatusCode -eq 200 -and $response.Content -match "WMS_Capabilities") {
        Write-Host "  [OK] External Gateway access working" -ForegroundColor Green

        # Count layers
        $layerMatches = [regex]::Matches($response.Content, "<Layer[^>]*>")
        Write-Host "    Found $($layerMatches.Count) layers" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] External Gateway access failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

# Test 6: Test frontend access
Write-Host ""
Write-Host "[6/6] Testing frontend access..." -ForegroundColor Yellow

try {
    $url = "http://${SERVER_IP}:5173"
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] Frontend is accessible" -ForegroundColor Green

        # Check if it's a valid HTML page
        if ($response.Content -match "<!DOCTYPE html>" -or $response.Content -match "<html") {
            Write-Host "    Valid HTML page loaded" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [WARNING] Unexpected response code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Frontend access failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "URLs to check:" -ForegroundColor Yellow
Write-Host "  Frontend: http://${SERVER_IP}:5173" -ForegroundColor Gray
Write-Host "  API Gateway: http://${GATEWAY_IP}:3000" -ForegroundColor Gray
Write-Host "  WMS Test: http://${GATEWAY_IP}:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray

Write-Host ""
Write-Host "What to check in browser:" -ForegroundColor Yellow
Write-Host "  1. Open: http://${SERVER_IP}:5173" -ForegroundColor Gray
Write-Host "  2. Press F12 to open DevTools" -ForegroundColor Gray
Write-Host "  3. Go to Network tab" -ForegroundColor Gray
Write-Host "  4. Look for requests to: ${GATEWAY_IP}:3000/api/mapserver" -ForegroundColor Gray
Write-Host "  5. Check Console tab for any errors" -ForegroundColor Gray

Write-Host ""
Write-Host "Expected behavior:" -ForegroundColor Yellow
Write-Host "  - Map layers should be visible" -ForegroundColor Gray
Write-Host "  - No 404 errors in console" -ForegroundColor Gray
Write-Host "  - WMS tile requests should return images (Content-Type: image/png)" -ForegroundColor Gray

Write-Host ""
