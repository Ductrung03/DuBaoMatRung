# PowerShell Script để test MapServer service

Write-Host "=== Testing MapServer Service ===" -ForegroundColor Green
Write-Host ""

# Test 1: Health check
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3008/health" -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   [OK] Health check passed" -ForegroundColor Green
        Write-Host "   Response: $($healthResponse.Content)" -ForegroundColor White
    }
} catch {
    Write-Host "   [ERROR] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Is the service running? Check: pm2 status" -ForegroundColor Yellow
}

# Test 2: WMS GetCapabilities
Write-Host ""
Write-Host "2. Testing WMS GetCapabilities..." -ForegroundColor Yellow
try {
    $wmsUrl = "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $wmsResponse = Invoke-WebRequest -Uri $wmsUrl -UseBasicParsing
    if ($wmsResponse.StatusCode -eq 200) {
        Write-Host "   [OK] WMS GetCapabilities successful" -ForegroundColor Green
        $contentType = $wmsResponse.Headers['Content-Type']
        Write-Host "   Content-Type: $contentType" -ForegroundColor White

        # Kiểm tra response có chứa WMS_Capabilities không
        if ($wmsResponse.Content -match "WMS_Capabilities") {
            Write-Host "   [OK] Valid WMS response detected" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Response doesn't look like valid WMS" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   [ERROR] WMS request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Check MapServer logs: pm2 logs mapserver-service" -ForegroundColor Yellow
}

# Test 3: Via Gateway
Write-Host ""
Write-Host "3. Testing via API Gateway..." -ForegroundColor Yellow
try {
    $gatewayUrl = "http://localhost:3000/api/mapserver?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $gatewayResponse = Invoke-WebRequest -Uri $gatewayUrl -UseBasicParsing
    if ($gatewayResponse.StatusCode -eq 200) {
        Write-Host "   [OK] Gateway proxy successful" -ForegroundColor Green
    }
} catch {
    Write-Host "   [ERROR] Gateway request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Is the gateway running? Check: pm2 status" -ForegroundColor Yellow
}

# Test 4: GetMap request (sample)
Write-Host ""
Write-Host "4. Testing WMS GetMap (sample layer)..." -ForegroundColor Yellow
try {
    $getMapUrl = "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap" +
                 "&LAYERS=ranhgioihc&STYLES=&CRS=EPSG:4326" +
                 "&BBOX=103.5,21.8,104.5,23.0&WIDTH=800&HEIGHT=600&FORMAT=image/png"

    $mapResponse = Invoke-WebRequest -Uri $getMapUrl -UseBasicParsing
    if ($mapResponse.StatusCode -eq 200) {
        $contentType = $mapResponse.Headers['Content-Type']
        if ($contentType -match "image") {
            Write-Host "   [OK] GetMap returned an image" -ForegroundColor Green
            Write-Host "   Content-Type: $contentType" -ForegroundColor White
            Write-Host "   Image size: $($mapResponse.Content.Length) bytes" -ForegroundColor White
        } else {
            Write-Host "   [WARNING] GetMap didn't return an image" -ForegroundColor Yellow
            Write-Host "   Content-Type: $contentType" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   [ERROR] GetMap request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This might be due to database connection or MapFile issues" -ForegroundColor Yellow
}

# Test 5: Check service status
Write-Host ""
Write-Host "5. Checking PM2 service status..." -ForegroundColor Yellow
pm2 status mapserver-service

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host ""
Write-Host "If all tests passed, MapServer is working correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "Common issues:" -ForegroundColor Yellow
Write-Host "- 500 errors: Check MapServer logs with 'pm2 logs mapserver-service'" -ForegroundColor White
Write-Host "- Database errors: Verify PostgreSQL connection in laocai.map" -ForegroundColor White
Write-Host "- Binary not found: Ensure MS4W is installed at C:\ms4w\" -ForegroundColor White
Write-Host "- Permission errors: Check tmp directory permissions" -ForegroundColor White
Write-Host ""
