# ===============================================
# Test MapServer trên Windows - Script Fix Lỗi
# ===============================================
# Script này test MapServer với config mới đã fix

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST MAPSERVER TRÊN WINDOWS SERVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Kiểm tra MS4W đã cài chưa
Write-Host "[1/5] Checking MS4W installation..." -ForegroundColor Yellow
$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
if (Test-Path $mapservPath) {
    Write-Host "  [OK] MapServer found: $mapservPath" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] MapServer NOT found at: $mapservPath" -ForegroundColor Red
    Write-Host "  Please install MS4W first!" -ForegroundColor Red
    exit 1
}

# 2. Kiểm tra file config Windows
Write-Host "`n[2/5] Checking config files..." -ForegroundColor Yellow
$configFile = "C:\DuBaoMatRung\mapserver\mapserver-windows.conf"
if (Test-Path $configFile) {
    Write-Host "  [OK] Config file found: $configFile" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Config file NOT found, will be created" -ForegroundColor Yellow

    # Tạo thư mục nếu chưa có
    $configDir = Split-Path $configFile
    if (!(Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    # Tạo config file
    @"
CONFIG
  ENV
    MS_ERRORFILE "C:/DuBaoMatRung/mapserver/logs/mapserver.log"
  END
  MAPS
  END
END
"@ | Out-File -FilePath $configFile -Encoding ASCII -Force
    Write-Host "  [OK] Config file created" -ForegroundColor Green
}

# 3. Kiểm tra mapfile
Write-Host "`n[3/5] Checking mapfile..." -ForegroundColor Yellow
$mapfile = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"
if (Test-Path $mapfile) {
    Write-Host "  [OK] Mapfile found: $mapfile" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Mapfile NOT found: $mapfile" -ForegroundColor Red
    Write-Host "  Please create this file!" -ForegroundColor Red
    exit 1
}

# 4. Tạo thư mục logs nếu chưa có
Write-Host "`n[4/5] Preparing log directory..." -ForegroundColor Yellow
$logDir = "C:\DuBaoMatRung\mapserver\logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "  [OK] Log directory created: $logDir" -ForegroundColor Green
} else {
    Write-Host "  [OK] Log directory exists: $logDir" -ForegroundColor Green
}

# 5. Test MapServer với config mới
Write-Host "`n[5/5] Testing MapServer with new config..." -ForegroundColor Yellow
Write-Host "  Running: mapserv.exe GetCapabilities..." -ForegroundColor Gray

$env:MS_CONFIG_FILE = $configFile
$env:MS_MAPFILE = $mapfile
$env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

try {
    $result = & $mapservPath 2>&1 | Out-String

    if ($result -match "WMS_Capabilities" -and $result -match "LaoCai_GIS") {
        Write-Host "`n  ======================================" -ForegroundColor Green
        Write-Host "  SUCCESS! MapServer is working!" -ForegroundColor Green
        Write-Host "  ======================================`n" -ForegroundColor Green

        Write-Host "Config used:" -ForegroundColor Cyan
        Write-Host "  - Config File: $configFile" -ForegroundColor White
        Write-Host "  - Map File: $mapfile" -ForegroundColor White
        Write-Host "  - MapServ Binary: $mapservPath" -ForegroundColor White

        Write-Host "`nNext Steps:" -ForegroundColor Cyan
        Write-Host "  1. Copy file .env.windows vào thư mục mapserver-service:" -ForegroundColor White
        Write-Host "     copy microservices\services\mapserver-service\.env.windows" -ForegroundColor Gray
        Write-Host "     microservices\services\mapserver-service\.env" -ForegroundColor Gray
        Write-Host "  2. Start service:" -ForegroundColor White
        Write-Host "     cd microservices\services\mapserver-service" -ForegroundColor Gray
        Write-Host "     node src\index.js" -ForegroundColor Gray
        Write-Host "  3. Test endpoint:" -ForegroundColor White
        Write-Host "     http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray

    } else {
        Write-Host "`n  [FAILED] MapServer returned unexpected output" -ForegroundColor Red
        Write-Host "`nOutput received:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Gray

        # Kiểm tra log file
        $logFile = "C:\DuBaoMatRung\mapserver\logs\mapserver.log"
        if (Test-Path $logFile) {
            Write-Host "`nLog file content:" -ForegroundColor Yellow
            Get-Content $logFile -Tail 20
        }
    }
} catch {
    Write-Host "`n  [ERROR] Failed to run MapServer" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
