# ===============================================
# FIX MAPSERVER - GIẢI PHÁP CUỐI CÙNG
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FIX MAPSERVER - FINAL SOLUTION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# BƯỚC 1: Kiểm tra ms4w.conf
Write-Host "[1] Checking MS4W main config..." -ForegroundColor Yellow
$ms4wConf = "C:\ms4w\ms4w.conf"

if (Test-Path $ms4wConf) {
    Write-Host "  Found: $ms4wConf" -ForegroundColor Green
    Write-Host "  Content:" -ForegroundColor Gray
    Get-Content $ms4wConf | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

    # Backup original
    Copy-Item $ms4wConf "$ms4wConf.backup" -Force
    Write-Host "  [OK] Backed up to $ms4wConf.backup" -ForegroundColor Green
}

# BƯỚC 2: Tạo CONFIG FILE ĐÚNG ĐỊNH DẠNG ở tất cả vị trí có thể
Write-Host "`n[2] Creating proper config files everywhere..." -ForegroundColor Yellow

# Empty config - format chuẩn
$properConfig = "CONFIG`r`nEND`r`n"

$locations = @(
    "C:\ms4w\ms4w.conf",
    "C:\ms4w\mapserver.conf",
    "C:\ms4w\Apache\cgi-bin\mapserver.conf",
    "C:\ms4w\Apache\conf\mapserver.conf",
    "C:\DuBaoMatRung\mapserver.conf"
)

foreach ($loc in $locations) {
    try {
        # Write với Windows line endings (CRLF)
        [System.IO.File]::WriteAllText($loc, $properConfig, [System.Text.Encoding]::ASCII)
        Write-Host "  [OK] Created: $loc" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $loc - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# BƯỚC 3: Test với strace-like tool để xem MapServer đang tìm file ở đâu
Write-Host "`n[3] Testing MapServer..." -ForegroundColor Yellow

$testMapfile = "C:\DuBaoMatRung\test-minimal.map"
$minimalMap = @"
MAP
  NAME "TEST"
  STATUS ON
  SIZE 400 300
  EXTENT -180 -90 180 90
  UNITS DD
  IMAGECOLOR 255 255 255
  WEB
    METADATA
      "wms_title" "Test"
      "wms_onlineresource" "http://localhost/"
      "wms_srs" "EPSG:4326"
      "wms_enable_request" "*"
    END
  END
  PROJECTION
    "init=epsg:4326"
  END
END
"@

[System.IO.File]::WriteAllText($testMapfile, $minimalMap, [System.Text.Encoding]::ASCII)

# Clear all env vars
Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$env:QUERY_STRING = "map=$testMapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result = & $mapservPath 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! MapServer is working!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green

    Write-Host "`nConfig files created at:" -ForegroundColor Cyan
    foreach ($loc in $locations) {
        if (Test-Path $loc) {
            Write-Host "  - $loc" -ForegroundColor White
        }
    }

    Write-Host "`nNow update Node.js service to use these settings." -ForegroundColor Yellow
    exit 0
}

# BƯỚC 4: Nếu vẫn lỗi, check Process Monitor style
Write-Host "`n[4] Still failed. Checking MapServer dependencies..." -ForegroundColor Yellow

# Check DLL dependencies
Write-Host "  Checking if all DLLs are available..." -ForegroundColor Gray
$ms4wBin = "C:\ms4w\Apache\cgi-bin"

if (Test-Path $ms4wBin) {
    $dlls = Get-ChildItem $ms4wBin -Filter "*.dll" | Select-Object -First 10
    Write-Host "  Found DLLs in $ms4wBin" -ForegroundColor Gray
}

# BƯỚC 5: Try running from ms4w directory
Write-Host "`n[5] Testing from MS4W directory..." -ForegroundColor Yellow
Push-Location "C:\ms4w\Apache\cgi-bin"

# Create config here
"CONFIG`r`nEND`r`n" | Out-File -FilePath "mapserver.conf" -Encoding ASCII -NoNewline

Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$env:QUERY_STRING = "map=$testMapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result2 = .\mapserv.exe 2>&1 | Out-String

if ($result2 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works when run from MS4W CGI-BIN directory!" -ForegroundColor Green
    Write-Host "  --> Solution: Start Node.js service from C:\ms4w\Apache\cgi-bin" -ForegroundColor Cyan
    Pop-Location
    exit 0
} else {
    Write-Host "  [FAILED] Still not working" -ForegroundColor Red
}

Pop-Location

# BƯỚC 6: Check if it's a MS4W package issue
Write-Host "`n[6] Checking MS4W installation integrity..." -ForegroundColor Yellow

$ms4wVersion = "C:\ms4w\README_INSTALL.html"
if (Test-Path $ms4wVersion) {
    Write-Host "  [OK] MS4W installation found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] MS4W may not be properly installed" -ForegroundColor Yellow
}

# BƯỚC 7: ULTIMATE FIX - Disable config requirement
Write-Host "`n[7] ULTIMATE FIX - Trying to disable config..." -ForegroundColor Yellow

# Try setting MS_CONFIG_FILE to empty or non-existent
$env:MS_CONFIG_FILE = ""
$result3 = & $mapservPath 2>&1 | Out-String

if ($result3 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works with MS_CONFIG_FILE empty!" -ForegroundColor Green
    exit 0
}

# Try with "NONE"
$env:MS_CONFIG_FILE = "NONE"
$result4 = & $mapservPath 2>&1 | Out-String

if ($result4 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works with MS_CONFIG_FILE=NONE!" -ForegroundColor Green
    exit 0
}

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  ALL METHODS FAILED" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

Write-Host "`nError output:" -ForegroundColor Yellow
Write-Host $result -ForegroundColor Gray

Write-Host "`nPossible solutions:" -ForegroundColor Cyan
Write-Host "  1. Reinstall MS4W from: https://ms4w.com" -ForegroundColor White
Write-Host "  2. Check MS4W documentation for config requirements" -ForegroundColor White
Write-Host "  3. Use MapServer through Apache instead of direct CGI" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
