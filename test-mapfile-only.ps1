# ===============================================
# Test MapServer WITHOUT Config File
# ===============================================
# Giả thuyết: Lỗi không phải do config mà do mapfile
# hoặc MapServer version này không cần config file

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST MAPSERVER WITHOUT CONFIG" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
$mapfile = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"

# Method 1: Using QUERY_STRING with map parameter (CGI standard)
Write-Host "[Method 1] Using QUERY_STRING with map parameter..." -ForegroundColor Yellow

# Clear all MS_ env vars
Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

# Use CGI standard way
$env:QUERY_STRING = "map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

Write-Host "  QUERY_STRING: $env:QUERY_STRING" -ForegroundColor Gray

$result1 = & $mapservPath 2>&1 | Out-String

if ($result1 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Method 1 works!" -ForegroundColor Green
    Write-Host "  --> Use QUERY_STRING with map parameter" -ForegroundColor Green

    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  SOLUTION FOUND!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "`nUpdate Node.js code to use map parameter in QUERY_STRING" -ForegroundColor White
    Write-Host "Don't use MS_MAPFILE or MS_CONFIG_FILE env vars" -ForegroundColor White
    exit 0
} else {
    Write-Host "  [FAILED] Method 1" -ForegroundColor Red
    if ($result1 -match "msLoadConfig") {
        Write-Host "  Still looking for config file" -ForegroundColor Yellow
    }
    if ($result1 -match "error") {
        Write-Host "  Error output:" -ForegroundColor Yellow
        Write-Host $result1 -ForegroundColor Gray
    }
}

# Method 2: Check if mapfile path is the issue
Write-Host "`n[Method 2] Testing with relative path..." -ForegroundColor Yellow

Push-Location "C:\DuBaoMatRung"
$relativePath = "mapserver\mapfiles\laocai-windows.map"

# Clear env
Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$env:QUERY_STRING = "map=$relativePath&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result2 = & $mapservPath 2>&1 | Out-String

if ($result2 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works with relative path!" -ForegroundColor Green
    Write-Host "  --> Run service from C:\DuBaoMatRung" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] Method 2" -ForegroundColor Red
}

Pop-Location

# Method 3: Check MS4W example configs
Write-Host "`n[Method 3] Checking MS4W example configs..." -ForegroundColor Yellow
$ms4wConfigs = Get-ChildItem "C:\ms4w" -Recurse -Filter "*.conf" -ErrorAction SilentlyContinue | Select-Object -First 5

if ($ms4wConfigs) {
    Write-Host "  Found example configs:" -ForegroundColor Gray
    foreach ($cfg in $ms4wConfigs) {
        Write-Host "    $($cfg.FullName)" -ForegroundColor Gray
    }

    # Try copying one
    $exampleConfig = $ms4wConfigs[0]
    if ($exampleConfig) {
        Write-Host "`n  Trying with example config..." -ForegroundColor Yellow
        Copy-Item $exampleConfig.FullName "C:\DuBaoMatRung\mapserver.conf" -Force

        Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
            Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
        }

        $env:QUERY_STRING = "map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
        $env:REQUEST_METHOD = "GET"

        $result3 = & $mapservPath 2>&1 | Out-String

        if ($result3 -match "WMS_Capabilities") {
            Write-Host "  [SUCCESS] Works with MS4W example config!" -ForegroundColor Green
            Write-Host "  Example config: $($exampleConfig.FullName)" -ForegroundColor Cyan
        } else {
            Write-Host "  [FAILED] Still not working" -ForegroundColor Red
        }
    }
}

# Method 4: Create minimal test mapfile
Write-Host "`n[Method 4] Testing with minimal mapfile..." -ForegroundColor Yellow
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
      "wms_onlineresource" "http://localhost/cgi-bin/mapserv.exe"
      "wms_srs" "EPSG:4326"
      "wms_enable_request" "*"
    END
  END

  PROJECTION
    "init=epsg:4326"
  END
END
"@

$minimalMap | Out-File -FilePath $testMapfile -Encoding ASCII -Force

Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$env:QUERY_STRING = "map=$testMapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result4 = & $mapservPath 2>&1 | Out-String

if ($result4 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Minimal mapfile works!" -ForegroundColor Green
    Write-Host "  --> Issue is with laocai-windows.map file" -ForegroundColor Yellow
    Write-Host "  Check PostgreSQL connection in mapfile" -ForegroundColor Cyan
} else {
    Write-Host "  [FAILED] Even minimal mapfile fails" -ForegroundColor Red
    Write-Host "  Output:" -ForegroundColor Yellow
    Write-Host $result4 -ForegroundColor Gray
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
