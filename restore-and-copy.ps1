# ===============================================
# RESTORE CONFIG VÀ COPY MAPFILE - GIẢI PHÁP CUỐI
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FINAL SOLUTION: Copy to MS4W Apps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# BƯỚC 1: Restore config gốc
Write-Host "[1] Restoring original MS4W config..." -ForegroundColor Yellow
$ms4wConf = "C:\ms4w\ms4w.conf"
$backupConf = "C:\ms4w\ms4w.conf.backup"

if (Test-Path $backupConf) {
    Copy-Item $backupConf $ms4wConf -Force
    Write-Host "  [OK] Original config restored" -ForegroundColor Green
}

# BƯỚC 2: Tạo app directory trong MS4W
Write-Host "`n[2] Creating application in MS4W..." -ForegroundColor Yellow
$appDir = "C:\ms4w\apps\dubao-matrung"
$mapfileDir = "$appDir\mapfiles"
$logsDir = "$appDir\logs"
$tmpDir = "$appDir\tmp"

foreach ($dir in @($appDir, $mapfileDir, $logsDir, $tmpDir)) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  [OK] Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Exists: $dir" -ForegroundColor Gray
    }
}

# BƯỚC 3: Copy mapfiles
Write-Host "`n[3] Copying mapfiles to MS4W..." -ForegroundColor Yellow
$sourceMapfiles = "C:\DuBaoMatRung\mapserver\mapfiles\*"

if (Test-Path "C:\DuBaoMatRung\mapserver\mapfiles") {
    Get-ChildItem "C:\DuBaoMatRung\mapserver\mapfiles" -Filter "*.map" | ForEach-Object {
        Copy-Item $_.FullName $mapfileDir -Force
        Write-Host "  [OK] Copied: $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  [ERROR] Source mapfiles directory not found" -ForegroundColor Red
    exit 1
}

# BƯỚC 4: Update mapfile với đường dẫn MS4W
Write-Host "`n[4] Updating mapfile configuration..." -ForegroundColor Yellow
$mapfile = "$mapfileDir\laocai-windows.map"

if (Test-Path $mapfile) {
    $content = Get-Content $mapfile -Raw

    # Update SHAPEPATH to use tmp directory
    $content = $content -replace 'SHAPEPATH\s+"[^"]*"', "SHAPEPATH `"C:/ms4w/apps/dubao-matrung/tmp`""

    # Update WEB IMAGEPATH
    $content = $content -replace 'IMAGEPATH\s+"[^"]*"', "IMAGEPATH `"C:/ms4w/apps/dubao-matrung/tmp/`""

    # Update IMAGEURL
    $content = $content -replace 'IMAGEURL\s+"[^"]*"', "IMAGEURL `"/tmp/`""

    # Update MS_ERRORFILE in metadata if exists
    $content = $content -replace 'MS_ERRORFILE\s+"[^"]*"', "MS_ERRORFILE `"C:/ms4w/apps/dubao-matrung/logs/mapserver.log`""

    # Update WMS onlineresource
    $content = $content -replace 'wms_onlineresource"\s+"[^"]*"', "wms_onlineresource`"  `"http://localhost:3008/wms?map=C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map&`""

    # Update WFS onlineresource
    $content = $content -replace 'wfs_onlineresource"\s+"[^"]*"', "wfs_onlineresource`"  `"http://localhost:3008/wms?map=C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map&`""

    $content | Out-File $mapfile -Encoding ASCII -Force
    Write-Host "  [OK] Updated paths in mapfile" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Mapfile not found after copy" -ForegroundColor Red
    exit 1
}

# BƯỚC 5: Test MapServer
Write-Host "`n[5] Testing MapServer with new location..." -ForegroundColor Yellow
Write-Host "  Mapfile: $mapfile" -ForegroundColor Gray

# Clear environment
Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

# Test with map parameter
$env:QUERY_STRING = "map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result = C:\ms4w\Apache\cgi-bin\mapserv.exe 2>&1 | Out-String

if ($result -match "WMS_Capabilities" -and $result -match "LaoCai_GIS") {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "           SUCCESS!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green

    Write-Host "`nMapServer is working!" -ForegroundColor Yellow
    Write-Host "`nNew locations:" -ForegroundColor Cyan
    Write-Host "  Application dir: $appDir" -ForegroundColor White
    Write-Host "  Mapfile: $mapfile" -ForegroundColor White
    Write-Host "  Logs: $logsDir" -ForegroundColor White
    Write-Host "  Temp: $tmpDir" -ForegroundColor White

    # Create updated .env file
    Write-Host "`n[6] Creating updated .env file..." -ForegroundColor Yellow
    $envContent = @"
# MapServer Service Environment - Windows Configuration
NODE_ENV=production
PORT=3008

# MapServer for Windows (MS4W)
MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe

# Mapfile in MS4W apps directory
MAPFILE_PATH=C:\ms4w\apps\dubao-matrung\mapfiles\laocai-windows.map

# Logging
LOG_LEVEL=info
"@

    $envPath = "C:\DuBaoMatRung\microservices\services\mapserver-service\.env"
    $envContent | Out-File $envPath -Encoding ASCII -Force
    Write-Host "  [OK] Created: $envPath" -ForegroundColor Green

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  NEXT STEPS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`n1. Start MapServer service:" -ForegroundColor Yellow
    Write-Host "   cd C:\DuBaoMatRung\microservices\services\mapserver-service" -ForegroundColor Gray
    Write-Host "   node src\index.js" -ForegroundColor Gray
    Write-Host "`n2. Test endpoints:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3008/health" -ForegroundColor Gray
    Write-Host "   http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray
    Write-Host "`n3. Frontend GIS URL:" -ForegroundColor Yellow
    Write-Host "   http://localhost:3008/wms" -ForegroundColor Gray

} else {
    Write-Host "`n[FAILED] MapServer still has issues" -ForegroundColor Red
    Write-Host "`nOutput:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Gray

    # Check if it's a database connection issue
    if ($result -match "ERROR" -or $result -match "PostgreSQL" -or $result -match "Connection") {
        Write-Host "`n[INFO] This might be a PostgreSQL connection issue" -ForegroundColor Yellow
        Write-Host "Check if PostgreSQL is running and accessible" -ForegroundColor White
        Write-Host "Connection details in mapfile:" -ForegroundColor Cyan
        Write-Host "  host=localhost port=5432 dbname=admin_db user=postgres password=4" -ForegroundColor Gray
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
