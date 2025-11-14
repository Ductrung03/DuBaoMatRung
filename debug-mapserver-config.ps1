# ===============================================
# Debug MapServer Config Issue
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEBUG MAPSERVER CONFIG" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
$mapfile = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"

# Test 1: Không dùng config file (MapServer sẽ dùng default)
Write-Host "[Test 1] Try WITHOUT config file..." -ForegroundColor Yellow
$env:MS_CONFIG_FILE = ""
Remove-Item Env:\MS_CONFIG_FILE -ErrorAction SilentlyContinue
$env:MS_MAPFILE = $mapfile
$env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result1 = & $mapservPath 2>&1 | Out-String
if ($result1 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works WITHOUT config file!" -ForegroundColor Green
    Write-Host "  --> Solution: Don't use MS_CONFIG_FILE at all" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] Still error" -ForegroundColor Red
    if ($result1 -match "msLoadConfig") {
        Write-Host "  --> MapServer is looking for config somewhere..." -ForegroundColor Yellow
    }
}

# Test 2: Dùng empty config tại working directory
Write-Host "`n[Test 2] Try with empty config in current directory..." -ForegroundColor Yellow
$emptyConfig = "mapserver.conf"
"CONFIG`nEND" | Out-File -FilePath $emptyConfig -Encoding ASCII -NoNewline -Force

$env:MS_CONFIG_FILE = $emptyConfig
$result2 = & $mapservPath 2>&1 | Out-String
if ($result2 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works with empty config in current dir!" -ForegroundColor Green
    Write-Host "  --> Solution: Create 'mapserver.conf' in working directory" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] Still error" -ForegroundColor Red
}

# Test 3: Dùng absolute path với forward slash
Write-Host "`n[Test 3] Try with absolute path (forward slash)..." -ForegroundColor Yellow
$configPath = "C:/DuBaoMatRung/mapserver/mapserver-windows.conf"
$env:MS_CONFIG_FILE = $configPath

$result3 = & $mapservPath 2>&1 | Out-String
if ($result3 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works with forward slash path!" -ForegroundColor Green
    Write-Host "  --> Solution: Use forward slash in path" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] Still error" -ForegroundColor Red
}

# Test 4: Check file content
Write-Host "`n[Test 4] Checking config file content..." -ForegroundColor Yellow
$configFile = "C:\DuBaoMatRung\mapserver\mapserver-windows.conf"
if (Test-Path $configFile) {
    Write-Host "  File exists: $configFile" -ForegroundColor White
    $content = Get-Content $configFile -Raw
    Write-Host "  File size: $($content.Length) bytes" -ForegroundColor White
    Write-Host "  Content:" -ForegroundColor White
    Write-Host $content -ForegroundColor Gray

    # Check encoding
    $bytes = [System.IO.File]::ReadAllBytes($configFile)
    Write-Host "  First 10 bytes: $($bytes[0..9] -join ' ')" -ForegroundColor Gray

    # Recreate with PROPER line endings
    Write-Host "`n  [Test 4a] Recreating with Unix line endings..." -ForegroundColor Yellow
    $properContent = "CONFIG`nEND`n"
    [System.IO.File]::WriteAllText($configFile, $properContent, [System.Text.Encoding]::ASCII)

    $env:MS_CONFIG_FILE = $configFile
    $result4 = & $mapservPath 2>&1 | Out-String
    if ($result4 -match "WMS_Capabilities") {
        Write-Host "  [SUCCESS] Works with Unix line endings!" -ForegroundColor Green
    } else {
        Write-Host "  [FAILED] Still error" -ForegroundColor Red
    }
}

# Test 5: Copy to multiple locations
Write-Host "`n[Test 5] Try config in multiple locations..." -ForegroundColor Yellow
$locations = @(
    "C:\ms4w\Apache\cgi-bin\mapserver.conf",
    "C:\DuBaoMatRung\mapserver.conf",
    "$PWD\mapserver.conf"
)

$simpleConfig = "CONFIG`nEND`n"
foreach ($loc in $locations) {
    try {
        [System.IO.File]::WriteAllText($loc, $simpleConfig, [System.Text.Encoding]::ASCII)
        Write-Host "  Created: $loc" -ForegroundColor Gray
    } catch {
        Write-Host "  Failed: $loc" -ForegroundColor Red
    }
}

# Test without MS_CONFIG_FILE again
Remove-Item Env:\MS_CONFIG_FILE -ErrorAction SilentlyContinue
$result5 = & $mapservPath 2>&1 | Out-String
if ($result5 -match "WMS_Capabilities") {
    Write-Host "  [SUCCESS] Works after creating configs everywhere!" -ForegroundColor Green
    Write-Host "  --> MapServer found config automatically" -ForegroundColor Green
} else {
    Write-Host "  [FAILED] Still error" -ForegroundColor Red
    Write-Host "`nFull output:" -ForegroundColor Yellow
    Write-Host $result5 -ForegroundColor Gray
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
