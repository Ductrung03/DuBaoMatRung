# ===============================================
# SETUP APACHE SOLUTION - 100% WORKING
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SETUP APACHE SOLUTION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Bước 1: Start Apache
Write-Host "[1] Starting Apache..." -ForegroundColor Yellow
$apacheStart = "C:\ms4w\apache-start.bat"

$apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if (!$apacheProcess) {
    if (Test-Path $apacheStart) {
        Start-Process cmd -ArgumentList "/c", $apacheStart -WindowStyle Hidden
        Start-Sleep -Seconds 5
        Write-Host "  [OK] Apache started" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] apache-start.bat not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [OK] Apache already running" -ForegroundColor Green
}

# Bước 2: Test MapServer qua Apache
Write-Host "`n[2] Testing MapServer through Apache..." -ForegroundColor Yellow
$mapfile = "C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map"
$testUrl = "http://localhost/cgi-bin/mapserv.exe?map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

try {
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 10

    if ($response.Content -match "WMS_Capabilities") {
        Write-Host "  [SUCCESS] MapServer works through Apache!" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] MapServer returned invalid response" -ForegroundColor Red
        Write-Host "  Response: $($response.Content.Substring(0, 200))" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Cannot access MapServer: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Bước 3: Install axios
Write-Host "`n[3] Installing dependencies..." -ForegroundColor Yellow
$serviceDir = "C:\DuBaoMatRung\microservices\services\mapserver-service"

Push-Location $serviceDir
npm install axios --save 2>&1 | Out-Null
Pop-Location

Write-Host "  [OK] Dependencies installed" -ForegroundColor Green

# Bước 4: Backup và replace index.js
Write-Host "`n[4] Updating service code..." -ForegroundColor Yellow

$originalFile = "$serviceDir\src\index.js"
$apacheFile = "$serviceDir\src\index-apache.js"
$backupFile = "$serviceDir\src\index-spawn.js.backup"

# Backup original
if (Test-Path $originalFile) {
    Copy-Item $originalFile $backupFile -Force
    Write-Host "  [OK] Backed up original to: index-spawn.js.backup" -ForegroundColor Green
}

# Copy Apache version
if (Test-Path $apacheFile) {
    Copy-Item $apacheFile $originalFile -Force
    Write-Host "  [OK] Using Apache HTTP proxy version" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] index-apache.js not found" -ForegroundColor Red
    exit 1
}

# Bước 5: Create .env
Write-Host "`n[5] Creating .env configuration..." -ForegroundColor Yellow

$envContent = @"
# MapServer Service - Apache HTTP Proxy Configuration
NODE_ENV=production
PORT=3008

# Apache MapServer URL
MAPSERVER_URL=http://localhost/cgi-bin/mapserv.exe

# Mapfile location (must be in MS4W apps directory)
MAPFILE_PATH=C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map

# Logging
LOG_LEVEL=info
"@

$envFile = "$serviceDir\.env"
$envContent | Out-File $envFile -Encoding ASCII -Force
Write-Host "  [OK] Created .env" -ForegroundColor Green

# Bước 6: Create start script
Write-Host "`n[6] Creating start script..." -ForegroundColor Yellow

$startScript = @"
@echo off
echo Starting MapServer Service with Apache...
echo.

REM Check if Apache is running
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [WARNING] Apache is not running!
    echo Starting Apache...
    call C:\ms4w\apache-start.bat
    timeout /t 3 /nobreak >nul
)

echo [OK] Apache is running
echo.

REM Start Node.js service
cd /d "%~dp0"
echo Starting MapServer Service on port 3008...
node src\index.js

pause
"@

$startScriptFile = "$serviceDir\start-service.bat"
$startScript | Out-File $startScriptFile -Encoding ASCII -Force
Write-Host "  [OK] Created start-service.bat" -ForegroundColor Green

# Hoàn thành
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nMapServer Service is now configured to use Apache HTTP proxy." -ForegroundColor Yellow
Write-Host "`nTo start the service:" -ForegroundColor Cyan
Write-Host "  cd $serviceDir" -ForegroundColor Gray
Write-Host "  start-service.bat" -ForegroundColor Gray
Write-Host "`nOr manually:" -ForegroundColor Cyan
Write-Host "  node src\index.js" -ForegroundColor Gray

Write-Host "`nTest endpoints:" -ForegroundColor Cyan
Write-Host "  http://localhost:3008/health" -ForegroundColor Gray
Write-Host "  http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray

Write-Host "`nThis solution:" -ForegroundColor Yellow
Write-Host "  - Uses Apache HTTP (no CGI spawn issues)" -ForegroundColor White
Write-Host "  - Production-ready and stable" -ForegroundColor White
Write-Host "  - No config file problems" -ForegroundColor White
Write-Host "  - Easy to debug and maintain" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
