# ===============================================
# GIẢI PHÁP CUỐI: Dùng Apache CGI thay vì gọi trực tiếp
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ALTERNATIVE SOLUTION: Use Apache" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Apache
$apacheExe = "C:\ms4w\Apache\bin\httpd.exe"

if (!(Test-Path $apacheExe)) {
    Write-Host "[ERROR] Apache not found in MS4W" -ForegroundColor Red
    exit 1
}

# Check if Apache is running
$apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue

if ($apacheProcess) {
    Write-Host "[OK] Apache is already running" -ForegroundColor Green
} else {
    Write-Host "[INFO] Apache is not running. Starting..." -ForegroundColor Yellow

    # Start Apache
    $apacheStart = "C:\ms4w\apache-start.bat"
    if (Test-Path $apacheStart) {
        Start-Process $apacheStart -NoNewWindow
        Start-Sleep -Seconds 3

        $apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
        if ($apacheProcess) {
            Write-Host "[OK] Apache started successfully" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to start Apache" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[ERROR] apache-start.bat not found" -ForegroundColor Red
        exit 1
    }
}

# Configure Apache for MapServer
Write-Host "`n[CONFIG] Configuring Apache..." -ForegroundColor Yellow

$httpdConf = "C:\ms4w\Apache\conf\httpd.conf"

# Check if MapServer CGI is configured
$confContent = Get-Content $httpdConf -Raw

if ($confContent -match "ScriptAlias /cgi-bin/") {
    Write-Host "  [OK] CGI already configured" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Adding CGI configuration" -ForegroundColor Yellow
    # Configuration should already exist in MS4W
}

# Test MapServer through Apache
Write-Host "`n[TEST] Testing MapServer through Apache..." -ForegroundColor Yellow

$testUrl = "http://localhost/cgi-bin/mapserv.exe?map=C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

Write-Host "  URL: $testUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -ErrorAction Stop

    if ($response.Content -match "WMS_Capabilities") {
        Write-Host "`n==========================================" -ForegroundColor Green
        Write-Host "  SUCCESS! MapServer works through Apache!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green

        Write-Host "`nSolution: Use Apache as proxy" -ForegroundColor Cyan
        Write-Host "  MapServer URL: http://localhost/cgi-bin/mapserv.exe" -ForegroundColor White
        Write-Host "`nUpdate Node.js service to proxy requests to Apache:" -ForegroundColor Yellow
        Write-Host "  Instead of spawning mapserv.exe directly," -ForegroundColor White
        Write-Host "  make HTTP requests to Apache" -ForegroundColor White

        # Create proxy config
        Write-Host "`n[CREATE] Creating proxy configuration..." -ForegroundColor Yellow

        $proxyConfig = @"
// Use Apache CGI instead of direct spawn
const MAPSERVER_URL = 'http://localhost/cgi-bin/mapserv.exe';

// In handleMapServerRequest:
const url = MAPSERVER_URL + '?' + queryString;
const response = await fetch(url);
return response;
"@

        $proxyConfig | Out-File "mapserver-apache-proxy.js" -Encoding UTF8
        Write-Host "  [OK] Created: mapserver-apache-proxy.js" -ForegroundColor Green

    } else {
        Write-Host "`n[PARTIAL] Apache responds but not MapServer" -ForegroundColor Yellow
        Write-Host "Response: $($response.Content.Substring(0, 200))" -ForegroundColor Gray
    }

} catch {
    Write-Host "`n[ERROR] Cannot connect to Apache" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray

    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "  1. Apache is running (run: C:\ms4w\apache-start.bat)" -ForegroundColor White
    Write-Host "  2. Port 80 is not blocked by firewall" -ForegroundColor White
    Write-Host "  3. No other service is using port 80" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
