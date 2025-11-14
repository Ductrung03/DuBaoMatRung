# ===============================================
# Quick Fix MapServer Config - Windows
# ===============================================
# Giải pháp: Tạo empty config file ở current directory

Write-Host "`nQuick Fix: Creating empty MapServer config..." -ForegroundColor Cyan

# Cách 1: Tạo empty config tại C:\DuBaoMatRung
$config1 = "C:\DuBaoMatRung\mapserver.conf"
$emptyConfig = "CONFIG`nEND`n"
[System.IO.File]::WriteAllText($config1, $emptyConfig, [System.Text.Encoding]::ASCII)
Write-Host "[OK] Created: $config1" -ForegroundColor Green

# Cách 2: Tạo tại C:\ms4w\Apache\cgi-bin
$config2 = "C:\ms4w\Apache\cgi-bin\mapserver.conf"
[System.IO.File]::WriteAllText($config2, $emptyConfig, [System.Text.Encoding]::ASCII)
Write-Host "[OK] Created: $config2" -ForegroundColor Green

# Cách 3: Update file config hiện tại với format đúng
$config3 = "C:\DuBaoMatRung\mapserver\mapserver-windows.conf"
[System.IO.File]::WriteAllText($config3, $emptyConfig, [System.Text.Encoding]::ASCII)
Write-Host "[OK] Updated: $config3" -ForegroundColor Green

# Test lại
Write-Host "`nTesting MapServer..." -ForegroundColor Yellow
$env:MS_MAPFILE = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"
$env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"
Remove-Item Env:\MS_CONFIG_FILE -ErrorAction SilentlyContinue

$result = C:\ms4w\Apache\cgi-bin\mapserv.exe 2>&1 | Out-String

if ($result -match "WMS_Capabilities" -and $result -match "LaoCai_GIS") {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! MapServer is now working!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "`nMapServer đã hoạt động. Bây giờ có thể:" -ForegroundColor White
    Write-Host "1. Start Node.js service:" -ForegroundColor Cyan
    Write-Host "   cd microservices\services\mapserver-service" -ForegroundColor Gray
    Write-Host "   copy .env.windows .env" -ForegroundColor Gray
    Write-Host "   node src\index.js" -ForegroundColor Gray
} else {
    Write-Host "`n[FAILED] Vẫn còn lỗi" -ForegroundColor Red
    Write-Host "Output:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Gray
}

Write-Host ""
