# ===============================================
# Initialize MapServer for Windows
# ===============================================
# Chạy script này TRƯỚC KHI start Node.js service

param(
    [string]$WorkingDir = "C:\DuBaoMatRung"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INITIALIZE MAPSERVER FOR WINDOWS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Tạo empty config tại working directory
Write-Host "[1/4] Creating MapServer config in working directory..." -ForegroundColor Yellow
$configPath = Join-Path $WorkingDir "mapserver.conf"
$emptyConfig = "CONFIG`nEND`n"

try {
    [System.IO.File]::WriteAllText($configPath, $emptyConfig, [System.Text.Encoding]::ASCII)
    Write-Host "  [OK] Created: $configPath" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to create config: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Kiểm tra mapfile
Write-Host "`n[2/4] Checking mapfile..." -ForegroundColor Yellow
$mapfile = Join-Path $WorkingDir "mapserver\mapfiles\laocai-windows.map"
if (Test-Path $mapfile) {
    Write-Host "  [OK] Mapfile exists: $mapfile" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Mapfile not found: $mapfile" -ForegroundColor Yellow
}

# 3. Tạo log directory
Write-Host "`n[3/4] Creating log directory..." -ForegroundColor Yellow
$logDir = Join-Path $WorkingDir "mapserver\logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-Host "  [OK] Created: $logDir" -ForegroundColor Green
} else {
    Write-Host "  [OK] Exists: $logDir" -ForegroundColor Green
}

# 4. Copy .env file cho service
Write-Host "`n[4/4] Setting up environment file..." -ForegroundColor Yellow
$envSource = Join-Path $WorkingDir "microservices\services\mapserver-service\.env.windows"
$envTarget = Join-Path $WorkingDir "microservices\services\mapserver-service\.env"

if (Test-Path $envSource) {
    Copy-Item $envSource $envTarget -Force
    Write-Host "  [OK] Copied .env.windows to .env" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] .env.windows not found" -ForegroundColor Yellow
}

# Test MapServer
Write-Host "`n[TEST] Testing MapServer..." -ForegroundColor Yellow
$env:MS_MAPFILE = $mapfile
$env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"
Remove-Item Env:\MS_CONFIG_FILE -ErrorAction SilentlyContinue

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
if (Test-Path $mapservPath) {
    $result = & $mapservPath 2>&1 | Out-String

    if ($result -match "WMS_Capabilities") {
        Write-Host "  [OK] MapServer test passed!" -ForegroundColor Green

        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "  INITIALIZATION COMPLETE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green

        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "  1. Start MapServer service:" -ForegroundColor White
        Write-Host "     cd $WorkingDir\microservices\services\mapserver-service" -ForegroundColor Gray
        Write-Host "     node src\index.js" -ForegroundColor Gray
        Write-Host "`n  2. Test endpoint:" -ForegroundColor White
        Write-Host "     http://localhost:3008/health" -ForegroundColor Gray
        Write-Host "     http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray

    } else {
        Write-Host "  [FAILED] MapServer test failed" -ForegroundColor Red
        Write-Host "`nOutput:" -ForegroundColor Yellow
        Write-Host $result -ForegroundColor Gray
    }
} else {
    Write-Host "  [ERROR] MapServer not found: $mapservPath" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
