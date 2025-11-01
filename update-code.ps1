# ===================================================================
# SCRIPT CẬP NHẬT CODE NHANH - WINDOWS SERVER
# Hệ thống Dự Báo Mất Rừng - DuBaoMatRung
# ===================================================================
# Sử dụng script này khi bạn chỉ muốn cập nhật code mà không cần
# cài đặt lại toàn bộ hệ thống
# ===================================================================

$ErrorActionPreference = "Stop"

$PROJECT_PATH = "C:\Projects\DuBaoMatRung"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput @"

===================================================================
  CẬP NHẬT CODE NHANH - DU BÁO MẤT RỪNG
===================================================================

"@ "Cyan"

try {
    # 1. Kiểm tra thư mục project
    if (-not (Test-Path $PROJECT_PATH)) {
        Write-ColorOutput "  Không tìm thấy thư mục project: $PROJECT_PATH" "Red"
        exit 1
    }

    Set-Location $PROJECT_PATH

    # 2. Lưu PM2 process list (tránh mất config)
    Write-ColorOutput "`n[1/7] Lưu cấu hình PM2..." "Yellow"
    pm2 save

    # 3. Dừng tất cả services
    Write-ColorOutput "[2/7] Dừng services..." "Yellow"
    pm2 stop all

    # 4. Pull code mới
    Write-ColorOutput "[3/7] Cập nhật code từ Git..." "Yellow"
    git fetch origin
    $currentBranch = git branch --show-current
    Write-ColorOutput "  Branch hiện tại: $currentBranch" "Cyan"
    git pull origin $currentBranch

    # 5. Cài đặt dependencies mới (nếu có)
    Write-ColorOutput "[4/7] Kiểm tra và cập nhật dependencies..." "Yellow"

    # Root dependencies
    if (Test-Path "package.json") {
        npm install --production
    }

    # Microservices dependencies
    if (Test-Path "microservices/package.json") {
        Set-Location "$PROJECT_PATH\microservices"
        npm install --production
    }

    # Client dependencies
    if (Test-Path "$PROJECT_PATH\client\package.json") {
        Set-Location "$PROJECT_PATH\client"
        npm install
    }

    # 6. Build frontend
    Write-ColorOutput "[5/7] Build frontend..." "Yellow"
    Set-Location "$PROJECT_PATH\client"
    npm run build

    # 7. Khởi động lại services
    Write-ColorOutput "[6/7] Khởi động lại services..." "Yellow"
    pm2 restart all

    # 8. Reload PM2
    Write-ColorOutput "[7/7] Reload PM2..." "Yellow"
    pm2 reload all

    # Hiển thị trạng thái
    Write-ColorOutput "`n=== TRẠNG THÁI HỆ THỐNG ===" "Green"
    pm2 status

    Write-ColorOutput "`n=== CẬP NHẬT THÀNH CÔNG! ===" "Green"
    Write-ColorOutput "  Thời gian: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Cyan"

} catch {
    Write-ColorOutput "`n=== LỖI KHI CẬP NHẬT ===" "Red"
    Write-ColorOutput $_.Exception.Message "Red"

    # Thử khởi động lại services
    Write-ColorOutput "`nĐang thử khởi động lại services..." "Yellow"
    pm2 restart all

    exit 1
}
