# ===============================================
# Deep Debug MapServer - Tìm Chính Xác Vấn Đề
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEEP DEBUG MAPSERVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
$mapfile = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"

# Test 1: Check MS4W structure
Write-Host "[1] Checking MS4W installation structure..." -ForegroundColor Yellow
$ms4wDirs = @(
    "C:\ms4w",
    "C:\ms4w\Apache",
    "C:\ms4w\Apache\cgi-bin",
    "C:\ms4w\apps",
    "C:\ms4w\apps\mapserver"
)

foreach ($dir in $ms4wDirs) {
    if (Test-Path $dir) {
        Write-Host "  [OK] $dir" -ForegroundColor Green
        # List config files
        $configs = Get-ChildItem -Path $dir -Filter "*.conf" -ErrorAction SilentlyContinue
        if ($configs) {
            foreach ($cfg in $configs) {
                Write-Host "      Found config: $($cfg.FullName)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  [NOT FOUND] $dir" -ForegroundColor Red
    }
}

# Test 2: Check MapServer version and help
Write-Host "`n[2] Checking MapServer version..." -ForegroundColor Yellow
try {
    $version = & $mapservPath -v 2>&1 | Out-String
    Write-Host $version -ForegroundColor Gray
} catch {
    Write-Host "  Cannot get version" -ForegroundColor Red
}

# Test 3: Run from different directories
Write-Host "`n[3] Testing from different working directories..." -ForegroundColor Yellow

$testDirs = @(
    "C:\DuBaoMatRung",
    "C:\ms4w\Apache\cgi-bin",
    "C:\ms4w",
    "C:\ms4w\apps\mapserver"
)

foreach ($testDir in $testDirs) {
    if (Test-Path $testDir) {
        Write-Host "  Testing from: $testDir" -ForegroundColor Cyan
        Push-Location $testDir

        # Create config here
        $localConfig = Join-Path $testDir "mapserver.conf"
        "CONFIG`nEND`n" | Out-File -FilePath $localConfig -Encoding ASCII -NoNewline -Force

        $env:MS_MAPFILE = $mapfile
        $env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
        $env:REQUEST_METHOD = "GET"
        Remove-Item Env:\MS_CONFIG_FILE -ErrorAction SilentlyContinue

        $result = & $mapservPath 2>&1 | Out-String

        if ($result -match "WMS_Capabilities") {
            Write-Host "    [SUCCESS] Works from this directory!" -ForegroundColor Green
            Write-Host "    --> Solution: Run Node.js service from: $testDir" -ForegroundColor Green
            Pop-Location
            break
        } else {
            Write-Host "    [FAILED]" -ForegroundColor Red
        }

        Pop-Location
    }
}

# Test 4: Check if mapfile is the issue
Write-Host "`n[4] Checking mapfile..." -ForegroundColor Yellow
if (Test-Path $mapfile) {
    Write-Host "  [OK] Mapfile exists" -ForegroundColor Green
    $mapContent = Get-Content $mapfile -First 5
    Write-Host "  First 5 lines:" -ForegroundColor Gray
    $mapContent | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

    # Try to validate mapfile
    Write-Host "  Validating mapfile..." -ForegroundColor Gray
    $env:MS_MAPFILE = $mapfile
    $env:QUERY_STRING = "map=$mapfile"
    $env:REQUEST_METHOD = "GET"

    $validateResult = & $mapservPath 2>&1 | Out-String
    if ($validateResult -match "error" -or $validateResult -match "failed") {
        Write-Host "  [ERROR] Mapfile has issues:" -ForegroundColor Red
        Write-Host $validateResult -ForegroundColor Gray
    }
} else {
    Write-Host "  [ERROR] Mapfile not found: $mapfile" -ForegroundColor Red
}

# Test 5: Try with MS4W's Apache directly
Write-Host "`n[5] Testing with Apache CGI..." -ForegroundColor Yellow
$apacheConf = "C:\ms4w\Apache\conf\httpd.conf"
if (Test-Path $apacheConf) {
    Write-Host "  [OK] Apache config found" -ForegroundColor Green
    Write-Host "  Check if Apache is running..." -ForegroundColor Gray

    $apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
    if ($apacheProcess) {
        Write-Host "  [OK] Apache is running" -ForegroundColor Green
        Write-Host "  Try accessing: http://localhost/cgi-bin/mapserv.exe" -ForegroundColor Cyan
    } else {
        Write-Host "  [INFO] Apache is not running" -ForegroundColor Yellow
        Write-Host "  You can start it with: C:\ms4w\apache-start.bat" -ForegroundColor Gray
    }
}

# Test 6: Try without any config file requirement
Write-Host "`n[6] Testing MapServer in simplest form..." -ForegroundColor Yellow
Write-Host "  Removing all MS_ env vars..." -ForegroundColor Gray

# Remove all MapServer env vars
Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

# Set only essential vars
$env:QUERY_STRING = "map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$simpleResult = & $mapservPath 2>&1 | Out-String

if ($simpleResult -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works without MS_* env vars!" -ForegroundColor Green
    Write-Host "  --> Solution: Only use QUERY_STRING with map parameter" -ForegroundColor Green
} else {
    Write-Host "  [FAILED]" -ForegroundColor Red
    Write-Host "  Output:" -ForegroundColor Yellow
    Write-Host $simpleResult -ForegroundColor Gray
}

# Test 7: Check file permissions
Write-Host "`n[7] Checking file permissions..." -ForegroundColor Yellow
$filesToCheck = @(
    "C:\DuBaoMatRung\mapserver.conf",
    $mapfile
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $acl = Get-Acl $file
        Write-Host "  $file" -ForegroundColor Gray
        Write-Host "    Owner: $($acl.Owner)" -ForegroundColor Gray
        Write-Host "    Readable: $(Test-Path $file -PathType Leaf)" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DEBUG COMPLETE - Check results above" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
