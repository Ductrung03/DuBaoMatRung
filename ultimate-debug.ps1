# ===============================================
# ULTIMATE DEBUG - Tìm chính xác vấn đề
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ULTIMATE DEBUG" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ms4wConf = "C:\ms4w\ms4w.conf"
$mapservExe = "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# Test 1: Check file readable
Write-Host "[1] Checking if ms4w.conf is readable..." -ForegroundColor Yellow

if (Test-Path $ms4wConf) {
    try {
        $content = Get-Content $ms4wConf -Raw -ErrorAction Stop
        Write-Host "  [OK] File is readable" -ForegroundColor Green
        Write-Host "  File size: $($content.Length) bytes" -ForegroundColor Gray

        # Check if valid
        if ($content -match "CONFIG") {
            Write-Host "  [OK] Contains CONFIG keyword" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Does not contain CONFIG!" -ForegroundColor Red
        }

        # Show first few lines
        Write-Host "`n  First 10 lines:" -ForegroundColor Gray
        ($content -split "`n")[0..9] | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

    } catch {
        Write-Host "  [ERROR] Cannot read file: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  [ERROR] File does not exist!" -ForegroundColor Red
}

# Test 2: Check permissions
Write-Host "`n[2] Checking file permissions..." -ForegroundColor Yellow
try {
    $acl = Get-Acl $ms4wConf
    Write-Host "  Owner: $($acl.Owner)" -ForegroundColor Gray
    Write-Host "  Access Rules:" -ForegroundColor Gray
    $acl.Access | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.IdentityReference): $($_.FileSystemRights)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  [ERROR] Cannot get ACL: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check file encoding
Write-Host "`n[3] Checking file encoding..." -ForegroundColor Yellow
$bytes = [System.IO.File]::ReadAllBytes($ms4wConf)
Write-Host "  First 20 bytes: $($bytes[0..19] -join ' ')" -ForegroundColor Gray

# Check for BOM
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "  [WARNING] File has UTF-8 BOM!" -ForegroundColor Yellow
} elseif ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    Write-Host "  [WARNING] File has UTF-16 LE BOM!" -ForegroundColor Yellow
} else {
    Write-Host "  [OK] No BOM detected" -ForegroundColor Green
}

# Test 4: Recreate config with PURE ASCII
Write-Host "`n[4] Recreating config with pure ASCII..." -ForegroundColor Yellow

# Backup current
Copy-Item $ms4wConf "$ms4wConf.debug-backup" -Force

# Create with .NET WriteAllBytes for absolute control
$configText = @"
CONFIG
  ENV
    MS_MAP_PATTERN "^(C:)?/ms4w/apps/((?!\.{2})[_A-Za-z0-9\-\.]+/{1})*([_A-Za-z0-9\-\.]+\.(map))`$"
    MS_MAPFILE_PATTERN "\.map`$"
    PROJ_DATA "C:/ms4w/share/proj"
    CURL_CA_BUNDLE "C:/ms4w/Apache/conf/ca-bundle/cacert.pem"
    MS_TEMPPATH "C:/ms4w/tmp/ms_tmp/"
  END
  MAPS
  END
END
"@

# Convert to pure ASCII bytes with CRLF
$lines = $configText -split "`n"
$asciiBytes = New-Object System.Collections.ArrayList

foreach ($line in $lines) {
    $line = $line.TrimEnd("`r")
    foreach ($char in $line.ToCharArray()) {
        [void]$asciiBytes.Add([byte][char]$char)
    }
    [void]$asciiBytes.Add([byte]13)  # CR
    [void]$asciiBytes.Add([byte]10)  # LF
}

[System.IO.File]::WriteAllBytes($ms4wConf, $asciiBytes.ToArray())
Write-Host "  [OK] Recreated with pure ASCII + CRLF" -ForegroundColor Green

# Test MapServer
Write-Host "`n[5] Testing MapServer with clean config..." -ForegroundColor Yellow

$testMap = "C:\ms4w\apps\dubao-matrung\mapfiles\laocai-windows.map"
$env:QUERY_STRING = "map=$testMap&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$result = & $mapservExe 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "`n[SUCCESS] IT WORKS NOW!" -ForegroundColor Green
    exit 0
}

# Test 6: Try without PostGIS layers
Write-Host "`n[6] Testing with simple mapfile (no PostGIS)..." -ForegroundColor Yellow

$simpleMap = "C:\ms4w\apps\dubao-matrung\mapfiles\test-simple.map"
$simpleContent = @"
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

[System.IO.File]::WriteAllText($simpleMap, $simpleContent, [System.Text.Encoding]::ASCII)

$env:QUERY_STRING = "map=$simpleMap&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result2 = & $mapservExe 2>&1 | Out-String

if ($result2 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Simple mapfile works!" -ForegroundColor Green
    Write-Host "  --> The issue is with PostGIS connection in main mapfile" -ForegroundColor Yellow
} else {
    Write-Host "  [FAILED] Even simple mapfile fails" -ForegroundColor Red
    Write-Host "`nOutput:" -ForegroundColor Yellow
    Write-Host $result2 -ForegroundColor Gray
}

# Test 7: Check MapServer version and build
Write-Host "`n[7] Checking MapServer version..." -ForegroundColor Yellow
try {
    $version = & $mapservExe -v 2>&1 | Out-String
    Write-Host $version -ForegroundColor Gray

    if ($version -match "CONFIG") {
        Write-Host "  [INFO] This MapServer version REQUIRES config file" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Cannot get version" -ForegroundColor Red
}

# Test 8: Try running as different user
Write-Host "`n[8] Checking current user..." -ForegroundColor Yellow
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "  Running as: $currentUser" -ForegroundColor Gray

# Test 9: Check if file is locked
Write-Host "`n[9] Checking if config file is locked..." -ForegroundColor Yellow
try {
    $fileStream = [System.IO.File]::Open($ms4wConf, 'Open', 'Read', 'None')
    $fileStream.Close()
    Write-Host "  [OK] File is not locked" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] File might be locked: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  DIAGNOSIS COMPLETE" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

Write-Host "`nIf all tests passed but MapServer still fails," -ForegroundColor Yellow
Write-Host "the issue is likely:" -ForegroundColor Yellow
Write-Host "  1. MS4W installation is corrupted" -ForegroundColor White
Write-Host "  2. MapServer.exe has a bug with config loading" -ForegroundColor White
Write-Host "  3. Need to reinstall MS4W" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
