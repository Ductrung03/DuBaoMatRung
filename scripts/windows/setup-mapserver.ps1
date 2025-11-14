# PowerShell Script để setup MapServer trên Windows
# Chạy script này với quyền Administrator

Write-Host "=== MapServer Setup for Windows ===" -ForegroundColor Green
Write-Host ""

# 1. Kiểm tra MS4W đã cài đặt chưa
Write-Host "1. Checking MS4W installation..." -ForegroundColor Yellow
$ms4wPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"

if (Test-Path $ms4wPath) {
    Write-Host "   [OK] MS4W found at: $ms4wPath" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] MS4W not found!" -ForegroundColor Red
    Write-Host "   Please download and install MS4W from: https://ms4w.com/" -ForegroundColor Yellow
    Write-Host "   Extract to C:\ms4w\" -ForegroundColor Yellow
    exit 1
}

# 2. Tạo thư mục tmp cho MapServer
Write-Host ""
Write-Host "2. Creating MapServer temp directory..." -ForegroundColor Yellow
$tmpPath = "C:\DuBaoMatRung\mapserver\tmp"

if (!(Test-Path $tmpPath)) {
    New-Item -ItemType Directory -Path $tmpPath -Force | Out-Null
    Write-Host "   [OK] Created: $tmpPath" -ForegroundColor Green
} else {
    Write-Host "   [OK] Directory already exists: $tmpPath" -ForegroundColor Green
}

# Cấp quyền đầy đủ cho thư mục tmp
icacls $tmpPath /grant Everyone:F /T | Out-Null
Write-Host "   [OK] Permissions set for tmp directory" -ForegroundColor Green

# 3. Kiểm tra MapFile
Write-Host ""
Write-Host "3. Checking MapFile..." -ForegroundColor Yellow
$mapFilePath = "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"

if (Test-Path $mapFilePath) {
    Write-Host "   [OK] MapFile found: $mapFilePath" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] MapFile not found: $mapFilePath" -ForegroundColor Yellow
    Write-Host "   Please ensure the mapfile exists before starting the service" -ForegroundColor Yellow
}

# 4. Tạo .env file cho MapServer service
Write-Host ""
Write-Host "4. Creating .env file for MapServer service..." -ForegroundColor Yellow
$envPath = "C:\DuBaoMatRung\microservices\services\mapserver-service\.env"
$envContent = @"
# MapServer Service Environment - Windows Configuration

NODE_ENV=production
PORT=3008

# MapServer for Windows (MS4W)
MAPSERV_BIN=C:\ms4w\Apache\cgi-bin\mapserv.exe
MAPFILE_PATH=C:\DuBaoMatRung\mapserver\mapfiles\laocai.map

# Logging
LOG_LEVEL=info
"@

Set-Content -Path $envPath -Value $envContent -Force
Write-Host "   [OK] .env file created: $envPath" -ForegroundColor Green

# 5. Kiểm tra PostgreSQL
Write-Host ""
Write-Host "5. Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue

if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "   [OK] PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] PostgreSQL is installed but not running" -ForegroundColor Yellow
        Write-Host "   Starting PostgreSQL..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Write-Host "   [OK] PostgreSQL started" -ForegroundColor Green
    }
} else {
    Write-Host "   [WARNING] PostgreSQL service not found" -ForegroundColor Yellow
    Write-Host "   Please ensure PostgreSQL is installed and running" -ForegroundColor Yellow
}

# 6. Test MapServer binary
Write-Host ""
Write-Host "6. Testing MapServer binary..." -ForegroundColor Yellow
try {
    $testResult = & $ms4wPath 2>&1
    if ($LASTEXITCODE -eq 0 -or $testResult -match "mapserv") {
        Write-Host "   [OK] MapServer binary is executable" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] MapServer binary test returned unexpected output" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARNING] Could not execute MapServer binary" -ForegroundColor Yellow
}

# 7. Kiểm tra Node.js
Write-Host ""
Write-Host "7. Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "   Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 8. Kiểm tra PM2
Write-Host ""
Write-Host "8. Checking PM2..." -ForegroundColor Yellow
$pm2Version = pm2 --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] PM2 version: $pm2Version" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] PM2 not found" -ForegroundColor Yellow
    Write-Host "   Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2 pm2-windows-startup
    Write-Host "   [OK] PM2 installed" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update MapFile with correct PostgreSQL connection string" -ForegroundColor White
Write-Host "2. Ensure PostgreSQL has the required databases and tables" -ForegroundColor White
Write-Host "3. Install dependencies: cd C:\DuBaoMatRung\microservices\services\mapserver-service && npm install" -ForegroundColor White
Write-Host "4. Start service: pm2 start ecosystem.config.js --only mapserver-service" -ForegroundColor White
Write-Host "5. Test service: curl http://localhost:3008/health" -ForegroundColor White
Write-Host ""
Write-Host "For troubleshooting, check logs: pm2 logs mapserver-service" -ForegroundColor Cyan
Write-Host ""
