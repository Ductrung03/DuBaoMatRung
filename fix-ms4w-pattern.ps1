# ===============================================
# FIX MS_MAP_PATTERN - ĐÂY LÀ VẤN ĐỀ!
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FIX MS_MAP_PATTERN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ms4wConf = "C:\ms4w\ms4w.conf"
$backupConf = "C:\ms4w\ms4w.conf.backup"

# Restore backup
if (Test-Path $backupConf) {
    Write-Host "[1] Restoring original config..." -ForegroundColor Yellow
    Copy-Item $backupConf $ms4wConf -Force
    Write-Host "  [OK] Restored from backup" -ForegroundColor Green
}

# Read current config
$config = Get-Content $ms4wConf -Raw

Write-Host "`n[2] Updating MS_MAP_PATTERN..." -ForegroundColor Yellow

# Replace restrictive pattern with permissive one
$oldPattern = 'MS_MAP_PATTERN "^(C:)?\/ms4w\/apps\/((?!\.{2})[_A-Za-z0-9\-\.]+\/{1})*([_A-Za-z0-9\-\.]+\.(map))$$"'
$newPattern = 'MS_MAP_PATTERN ".*\.map$$"'

if ($config -match 'MS_MAP_PATTERN') {
    Write-Host "  Found MS_MAP_PATTERN - replacing..." -ForegroundColor Gray
    $config = $config -replace 'MS_MAP_PATTERN "[^"]*"', $newPattern
    Write-Host "  [OK] Updated to allow all .map files" -ForegroundColor Green
} else {
    Write-Host "  MS_MAP_PATTERN not found - adding..." -ForegroundColor Gray
    # Add after ENV line
    $config = $config -replace '(ENV\s*\n)', "`$1    $newPattern`n"
    Write-Host "  [OK] Added MS_MAP_PATTERN" -ForegroundColor Green
}

# Also uncomment/set MS_MAP_NO_PATH to allow map parameter
if ($config -match '#\s*MS_MAP_NO_PATH') {
    Write-Host "  Enabling MS_MAP_NO_PATH..." -ForegroundColor Gray
    $config = $config -replace '#\s*MS_MAP_NO_PATH "[^"]*"', 'MS_MAP_NO_PATH "1"'
} else {
    Write-Host "  Adding MS_MAP_NO_PATH..." -ForegroundColor Gray
    $config = $config -replace '(MS_MAP_PATTERN[^\n]*\n)', "`$1    MS_MAP_NO_PATH `"1`"`n"
}

# Save config
$config | Out-File -FilePath $ms4wConf -Encoding ASCII -Force

Write-Host "`n[3] Config updated. Testing MapServer..." -ForegroundColor Yellow

# Test direct CGI
Write-Host "  [Test 1] Direct CGI call..." -ForegroundColor Cyan
$env:QUERY_STRING = "map=C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

Get-ChildItem Env: | Where-Object { $_.Name -like "MS_*" -and $_.Name -ne "MS_MAP_PATTERN" } | ForEach-Object {
    Remove-Item "Env:\$($_.Name)" -ErrorAction SilentlyContinue
}

$result = C:\ms4w\Apache\cgi-bin\mapserv.exe 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Direct CGI works!" -ForegroundColor Green

    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  PROBLEM SOLVED!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green

    Write-Host "`nThe issue was MS_MAP_PATTERN blocking your mapfile path!" -ForegroundColor Yellow
    Write-Host "Config updated to allow all .map files." -ForegroundColor White

    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Start MapServer service:" -ForegroundColor White
    Write-Host "     cd C:\DuBaoMatRung\microservices\services\mapserver-service" -ForegroundColor Gray
    Write-Host "     copy .env.windows .env" -ForegroundColor Gray
    Write-Host "     node src\index.js" -ForegroundColor Gray

} else {
    Write-Host "  [INFO] Still has issues, trying Apache..." -ForegroundColor Yellow

    # Test through Apache
    Write-Host "`n  [Test 2] Through Apache..." -ForegroundColor Cyan

    try {
        $testUrl = "http://localhost/cgi-bin/mapserv.exe?map=C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
        $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -ErrorAction Stop

        if ($response.Content -match "WMS_Capabilities") {
            Write-Host "  [SUCCESS] Apache CGI works!" -ForegroundColor Green

            Write-Host "`n==========================================" -ForegroundColor Green
            Write-Host "  PROBLEM SOLVED!" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green

            Write-Host "`nMapServer works through Apache!" -ForegroundColor Yellow
            Write-Host "Use Apache as proxy in Node.js service." -ForegroundColor White

        } else {
            Write-Host "  [PARTIAL] Got response but not WMS:" -ForegroundColor Yellow
            Write-Host $response.Content.Substring(0, [Math]::Min(500, $response.Content.Length)) -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [ERROR] Apache test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
