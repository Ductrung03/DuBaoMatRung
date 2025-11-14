# ===============================================
# GIẢI PHÁP 2: Copy mapfile vào MS4W apps
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  COPY MAPFILE TO MS4W" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Restore original config
$ms4wConf = "C:\ms4w\ms4w.conf"
$backupConf = "C:\ms4w\ms4w.conf.backup"

if (Test-Path $backupConf) {
    Write-Host "[1] Restoring original MS4W config..." -ForegroundColor Yellow
    Copy-Item $backupConf $ms4wConf -Force
    Write-Host "  [OK] Restored" -ForegroundColor Green
}

# Create app directory
Write-Host "`n[2] Creating app directory in MS4W..." -ForegroundColor Yellow
$appDir = "C:\ms4w\apps\dubao-matrung"
$mapfileDir = "$appDir\mapfiles"
$logsDir = "$appDir\logs"
$tmpDir = "$appDir\tmp"

foreach ($dir in @($appDir, $mapfileDir, $logsDir, $tmpDir)) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  [OK] Created: $dir" -ForegroundColor Green
    }
}

# Copy mapfiles
Write-Host "`n[3] Copying mapfiles..." -ForegroundColor Yellow
$sourceMapfiles = "C:\DuBaoMatRung\mapserver\mapfiles\*"
Copy-Item $sourceMapfiles $mapfileDir -Force
Write-Host "  [OK] Copied mapfiles to $mapfileDir" -ForegroundColor Green

# Update mapfile paths to use MS4W structure
Write-Host "`n[4] Updating mapfile paths..." -ForegroundColor Yellow
$mapfile = "$mapfileDir\laocai-windows.map"

if (Test-Path $mapfile) {
    $content = Get-Content $mapfile -Raw

    # Update SHAPEPATH
    $content = $content -replace 'SHAPEPATH "[^"]*"', "SHAPEPATH `"$tmpDir`""

    # Update WEB IMAGEPATH
    $content = $content -replace 'IMAGEPATH "[^"]*"', "IMAGEPATH `"$tmpDir/`""

    # Update connection strings if needed (localhost should work)

    $content | Out-File $mapfile -Encoding ASCII -Force
    Write-Host "  [OK] Updated paths in mapfile" -ForegroundColor Green
}

# Test MapServer with new location
Write-Host "`n[5] Testing MapServer..." -ForegroundColor Yellow

$env:QUERY_STRING = "map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$result = C:\ms4w\Apache\cgi-bin\mapserv.exe 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green

    Write-Host "`nMapServer is working with mapfile in MS4W directory!" -ForegroundColor Yellow
    Write-Host "  Mapfile: $mapfile" -ForegroundColor White

    Write-Host "`nUpdate your .env.windows:" -ForegroundColor Cyan
    Write-Host "  MAPFILE_PATH=$mapfile" -ForegroundColor Gray

    Write-Host "`nThen start service:" -ForegroundColor Cyan
    Write-Host "  cd C:\DuBaoMatRung\microservices\services\mapserver-service" -ForegroundColor Gray
    Write-Host "  copy .env.windows .env" -ForegroundColor Gray
    Write-Host "  node src\index.js" -ForegroundColor Gray

} else {
    Write-Host "`n[FAILED] Still has issues:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Gray
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
