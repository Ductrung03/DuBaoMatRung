# quick-deploy.ps1
# Script deploy nhanh frontend lên server

param(
    [string]$ServerIP = "103.56.160.66",
    [string]$ServerUser = "Administrator",
    [string]$DeployPath = "C:\DuBaoMatRung"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  QUICK DEPLOY TO SERVER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if client/dist exists
if (-Not (Test-Path "client\dist")) {
    Write-Host "❌ Folder client\dist không tồn tại!" -ForegroundColor Red
    Write-Host "   Chạy: cd client; npm run build" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found client/dist folder" -ForegroundColor Green

# Tạo deployment package
Write-Host "`n[1/3] Tạo deployment package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$packageName = "frontend-deploy-$timestamp.zip"

# Compress client/dist
Write-Host "  Compressing client/dist..." -ForegroundColor Gray
Compress-Archive -Path "client\dist\*" -DestinationPath $packageName -Force
Write-Host "  ✓ Created $packageName" -ForegroundColor Green

# Size of package
$size = (Get-Item $packageName).Length / 1MB
Write-Host "  Package size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan

# Instructions for manual upload
Write-Host "`n[2/3] Upload package to server..." -ForegroundColor Yellow
Write-Host "  📦 File: $packageName" -ForegroundColor Cyan
Write-Host "`n  CHỌN 1 TRONG 3 CÁCH SAU:" -ForegroundColor White
Write-Host "`n  Cách 1: Remote Desktop (Khuyến nghị)" -ForegroundColor Green
Write-Host "    - Mở Remote Desktop kết nối $ServerIP" -ForegroundColor Gray
Write-Host "    - Copy file $packageName vào server" -ForegroundColor Gray
Write-Host "    - Paste vào thư mục $DeployPath" -ForegroundColor Gray

Write-Host "`n  Cách 2: SCP (nếu có OpenSSH)" -ForegroundColor Green
Write-Host "    scp $packageName ${ServerUser}@${ServerIP}:$DeployPath/" -ForegroundColor Gray

Write-Host "`n  Cách 3: USB/Network Share" -ForegroundColor Green
Write-Host "    - Copy file qua USB hoặc shared folder" -ForegroundColor Gray

Write-Host "`n[3/3] Sau khi upload, chạy trên SERVER:" -ForegroundColor Yellow
Write-Host @"

# 1. Extract package
cd $DeployPath
Expand-Archive -Path $packageName -DestinationPath temp_dist -Force

# 2. Backup old dist
if (Test-Path client\dist_backup) { Remove-Item -Recurse -Force client\dist_backup }
if (Test-Path client\dist) { Move-Item client\dist client\dist_backup }

# 3. Deploy new dist
Move-Item temp_dist client\dist

# 4. Cleanup
Remove-Item $packageName
Remove-Item -Recurse temp_dist -ErrorAction SilentlyContinue

# 5. Restart PM2 (để clear cache)
pm2 restart gateway

Write-Host "✅ Deploy completed!" -ForegroundColor Green

"@ -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Package created: $packageName" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Open folder
Start-Process explorer.exe -ArgumentList "/select,$packageName"
