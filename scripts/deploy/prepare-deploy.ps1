# Script chuẩn bị deploy package để copy lên server
# Chạy trên máy Windows hiện tại

Write-Host "🚀 Preparing deployment package..." -ForegroundColor Green

# Tạo thư mục deploy
$deployDir = ".\deploy-package"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# Danh sách thư mục/file cần copy
$itemsToCopy = @(
    "microservices",
    "client",
    "mapserver",
    "package.json",
    "ecosystem.config.js"
)

Write-Host "📦 Copying source code..." -ForegroundColor Yellow

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        Write-Host "  Copying $item..." -ForegroundColor Gray
        Copy-Item $item -Destination $deployDir -Recurse -Force
    }
}

# Copy .env.example thành .env
if (Test-Path ".env.example") {
    Copy-Item ".env.example" "$deployDir\.env"
    Write-Host "  ✓ Created .env from .env.example" -ForegroundColor Gray
} elseif (Test-Path "microservices\.env") {
    Copy-Item "microservices\.env" "$deployDir\.env"
    Write-Host "  ✓ Copied existing .env" -ForegroundColor Gray
}

# Xóa node_modules trong package
Write-Host "🧹 Cleaning unnecessary files..." -ForegroundColor Yellow
Get-ChildItem -Path $deployDir -Include node_modules,dist,build,.git -Recurse -Force -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path $deployDir -Include *.log -Recurse -Force -File | Remove-Item -Force

# Tạo thư mục cần thiết
New-Item -ItemType Directory -Force -Path "$deployDir\backups" | Out-Null
New-Item -ItemType Directory -Force -Path "$deployDir\uploads" | Out-Null

Write-Host ""
Write-Host "✅ Deploy package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Location: $deployDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Zip thư mục '$deployDir'" -ForegroundColor White
Write-Host "  2. Copy file zip lên server (USB/Network/FTP)" -ForegroundColor White
Write-Host "  3. Giải nén trên server" -ForegroundColor White
Write-Host "  4. Chạy setup-server.ps1 trên server" -ForegroundColor White
Write-Host ""

# Tính kích thước
$size = (Get-ChildItem -Path $deployDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📊 Package size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
