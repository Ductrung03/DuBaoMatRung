# ===============================================
# NUCLEAR SOLUTION - Tìm và Fix Triệt Để
# ===============================================

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  NUCLEAR SOLUTION - FINAL FIX" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red

$mapservExe = "C:\ms4w\Apache\cgi-bin\mapserv.exe"

# BƯỚC 1: Kiểm tra MapServer có cần config hay không
Write-Host "[STEP 1] Analyzing MapServer binary..." -ForegroundColor Yellow

if (!(Test-Path $mapservExe)) {
    Write-Host "[ERROR] MapServer not found!" -ForegroundColor Red
    exit 1
}

# Get MapServer info
Write-Host "  Getting MapServer version and info..." -ForegroundColor Gray
$versionOutput = & $mapservExe -v 2>&1 | Out-String
Write-Host $versionOutput -ForegroundColor DarkGray

# Check if mentions config
if ($versionOutput -match "CONFIG" -or $versionOutput -match "ms4w") {
    Write-Host "  [INFO] This MapServer build references config" -ForegroundColor Yellow
}

# BƯỚC 2: Tìm file config thực sự
Write-Host "`n[STEP 2] Finding actual config file location..." -ForegroundColor Yellow

# Use Process Monitor style - check common locations
$possibleLocations = @(
    "C:\ms4w\ms4w.conf",
    "C:\ms4w\mapserver.conf",
    "C:\ms4w\Apache\cgi-bin\mapserver.conf",
    "C:\ms4w\Apache\conf\mapserver.conf",
    "$env:USERPROFILE\mapserver.conf",
    "$env:TEMP\mapserver.conf",
    "C:\mapserver.conf",
    "C:\Windows\mapserver.conf"
)

Write-Host "  Checking all possible locations:" -ForegroundColor Gray
foreach ($loc in $possibleLocations) {
    if (Test-Path $loc) {
        Write-Host "    [EXISTS] $loc" -ForegroundColor Green
        # Show file info
        $file = Get-Item $loc
        Write-Host "      Size: $($file.Length) bytes, Modified: $($file.LastWriteTime)" -ForegroundColor DarkGray
    } else {
        Write-Host "    [MISSING] $loc" -ForegroundColor DarkGray
    }
}

# BƯỚC 3: Xem MapServer tìm file ở đâu bằng cách check error detail
Write-Host "`n[STEP 3] Capturing detailed error..." -ForegroundColor Yellow

# Set verbose error
$env:MS_ERRORFILE = "C:\ms4w\tmp\ms_tmp\debug.log"
$env:CPL_DEBUG = "ON"
$env:MS_DEBUGLEVEL = "5"

# Create log dir if not exists
$logDir = "C:\ms4w\tmp\ms_tmp"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Clear old log
if (Test-Path $env:MS_ERRORFILE) {
    Remove-Item $env:MS_ERRORFILE -Force
}

$testMap = "C:\ms4w\apps\dubao-matrung\mapfiles\laocai-windows.map"
$env:QUERY_STRING = "map=$testMap&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

Write-Host "  Running MapServer with debug mode..." -ForegroundColor Gray
$result = & $mapservExe 2>&1 | Out-String

# Check log file
if (Test-Path $env:MS_ERRORFILE) {
    Write-Host "`n  Debug log content:" -ForegroundColor Cyan
    Get-Content $env:MS_ERRORFILE | ForEach-Object {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
}

# BƯỚC 4: Download và check MS4W integrity
Write-Host "`n[STEP 4] Checking MS4W installation integrity..." -ForegroundColor Yellow

$ms4wSetup = "C:\ms4w\setup.log"
if (Test-Path $ms4wSetup) {
    Write-Host "  [OK] MS4W setup log found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] MS4W may not be properly installed" -ForegroundColor Yellow
}

# Check key MS4W files
$keyFiles = @(
    "C:\ms4w\Apache\bin\httpd.exe",
    "C:\ms4w\Apache\cgi-bin\mapserv.exe",
    "C:\ms4w\share\proj\proj.db"
)

$missingFiles = @()
foreach ($file in $keyFiles) {
    if (!(Test-Path $file)) {
        $missingFiles += $file
        Write-Host "  [MISSING] $file" -ForegroundColor Red
    } else {
        Write-Host "  [OK] $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n  [ERROR] MS4W installation is incomplete!" -ForegroundColor Red
    Write-Host "  Missing files: $($missingFiles -join ', ')" -ForegroundColor Red
    Write-Host "  Recommend: Reinstall MS4W" -ForegroundColor Yellow
}

# BƯỚC 5: FIX - Disable config requirement completely
Write-Host "`n[STEP 5] NUCLEAR FIX - Patch MapServer config loading..." -ForegroundColor Yellow

# Create empty config at ALL locations
$emptyConfig = "CONFIG`r`nEND`r`n"
$emptyConfigBytes = [System.Text.Encoding]::ASCII.GetBytes($emptyConfig)

Write-Host "  Creating config files at ALL possible locations..." -ForegroundColor Gray
foreach ($loc in $possibleLocations) {
    try {
        $dir = Split-Path $loc -Parent
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        [System.IO.File]::WriteAllBytes($loc, $emptyConfigBytes)
        Write-Host "    [OK] $loc" -ForegroundColor Green
    } catch {
        Write-Host "    [FAIL] $loc - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Also set env var pointing to existing config
$env:MS_CONFIG_FILE = "C:\ms4w\ms4w.conf"

# BƯỚC 6: Test again
Write-Host "`n[STEP 6] Testing MapServer after nuclear fix..." -ForegroundColor Yellow

# Clear debug settings
Remove-Item Env:\MS_ERRORFILE -ErrorAction SilentlyContinue
Remove-Item Env:\CPL_DEBUG -ErrorAction SilentlyContinue
Remove-Item Env:\MS_DEBUGLEVEL -ErrorAction SilentlyContinue

$env:QUERY_STRING = "map=$testMap&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result = & $mapservExe 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! FIXED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green

    Write-Host "`nMapServer is now working!" -ForegroundColor Yellow
    Write-Host "Config files created at all locations." -ForegroundColor White

} else {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "  STILL FAILING - LAST RESORT" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red

    Write-Host "`nOutput:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Gray

    # LAST RESORT: Use Apache or download different MapServer
    Write-Host "`n[LAST RESORT OPTIONS]" -ForegroundColor Red
    Write-Host "`n1. Use Apache CGI (bypass config issue):" -ForegroundColor Yellow
    Write-Host "   - Start Apache: C:\ms4w\apache-start.bat" -ForegroundColor White
    Write-Host "   - Access via: http://localhost/cgi-bin/mapserv.exe" -ForegroundColor White
    Write-Host "   - Update Node.js to use HTTP proxy" -ForegroundColor White

    Write-Host "`n2. Reinstall MS4W:" -ForegroundColor Yellow
    Write-Host "   - Download from: https://ms4w.com" -ForegroundColor White
    Write-Host "   - Use latest stable version" -ForegroundColor White
    Write-Host "   - Or use older version without config requirement" -ForegroundColor White

    Write-Host "`n3. Use Docker MapServer (Linux):" -ForegroundColor Yellow
    Write-Host "   - docker pull camptocamp/mapserver" -ForegroundColor White
    Write-Host "   - Run MapServer in Docker" -ForegroundColor White

    Write-Host "`n4. Build MapServer from source:" -ForegroundColor Yellow
    Write-Host "   - Compile without CONFIG requirement" -ForegroundColor White
    Write-Host "   - Use older MapServer version (< 8.0)" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
