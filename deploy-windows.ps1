# ===================================================================
# SCRIPT DEPLOYMENT CHO WINDOWS SERVER
# Hệ thống Dự Báo Mất Rừng - DuBaoMatRung
# ===================================================================
#
param(
    [switch]$FirstTime,
    [switch]$UpdateOnly
)

$ErrorActionPreference = "Stop"

# ===================================================================
# CẤU HÌNH
# ===================================================================
$PROJECT_NAME = "DuBaoMatRung"
$DEPLOY_PATH = "C:\Projects\$PROJECT_NAME"
$GIT_REPO = "https://github.com/luckyboiz/dubaomatrung.git"  # Thay đổi nếu dùng repo khác
$NODE_VERSION = "18.0.0"  # Phiên bản Node.js yêu cầu

# Cấu hình database
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "dubaomatrung"
$DB_USER = "postgres"
$DB_PASSWORD = "your_password_here"  # Thay đổi password

# Cấu hình ports
$GATEWAY_PORT = 3000
$AUTH_PORT = 3001
$USER_PORT = 3002
$GIS_PORT = 3003
$REPORT_PORT = 3004
$ADMIN_PORT = 3005
$SEARCH_PORT = 3006
$MAPSERVER_PORT = 3007
$CLIENT_PORT = 5173

# ===================================================================
# FUNCTIONS
# ===================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Check-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Check-Prerequisites {
    Write-ColorOutput "`n=== Kiểm tra yêu cầu hệ thống ===" "Yellow"

    # Kiểm tra Node.js
    if (Check-Command "node") {
        $nodeVersion = node --version
        Write-ColorOutput "  Node.js: $nodeVersion" "Green"
    } else {
        Write-ColorOutput "  Node.js chưa cài đặt!" "Red"
        Write-ColorOutput "  Tải và cài đặt từ: https://nodejs.org" "Yellow"
        exit 1
    }

    # Kiểm tra npm
    if (Check-Command "npm") {
        $npmVersion = npm --version
        Write-ColorOutput "  npm: v$npmVersion" "Green"
    } else {
        Write-ColorOutput "  npm chưa cài đặt!" "Red"
        exit 1
    }

    # Kiểm tra Git
    if (Check-Command "git") {
        $gitVersion = git --version
        Write-ColorOutput "  Git: $gitVersion" "Green"
    } else {
        Write-ColorOutput "  Git chưa cài đặt!" "Red"
        Write-ColorOutput "  Tải và cài đặt từ: https://git-scm.com" "Yellow"
        exit 1
    }

    # Kiểm tra PostgreSQL
    if (Check-Command "psql") {
        Write-ColorOutput "  PostgreSQL: Đã cài đặt" "Green"
    } else {
        Write-ColorOutput "  PostgreSQL chưa cài đặt!" "Red"
        Write-ColorOutput "  Tải và cài đặt từ: https://www.postgresql.org/download/windows/" "Yellow"
        exit 1
    }

    # Kiểm tra PM2 (optional nhưng khuyến nghị)
    if (Check-Command "pm2") {
        Write-ColorOutput "  PM2: Đã cài đặt" "Green"
    } else {
        Write-ColorOutput "  PM2 chưa cài đặt. Đang cài đặt..." "Yellow"
        npm install -g pm2
        npm install -g pm2-windows-startup
        pm2-startup install
        Write-ColorOutput "  PM2 đã được cài đặt" "Green"
    }
}

function Stop-Services {
    Write-ColorOutput "`n=== Dừng các services đang chạy ===" "Yellow"

    # Dừng PM2 nếu đang chạy
    if (Check-Command "pm2") {
        pm2 stop all
        pm2 delete all
    }

    # Kill các port đang sử dụng
    $ports = @($GATEWAY_PORT, $AUTH_PORT, $USER_PORT, $GIS_PORT, $REPORT_PORT,
               $ADMIN_PORT, $SEARCH_PORT, $MAPSERVER_PORT, $CLIENT_PORT)

    foreach ($port in $ports) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connection) {
            $processId = $connection.OwningProcess
            Write-ColorOutput "  Đang dừng process trên port $port (PID: $processId)" "Cyan"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }

    Write-ColorOutput "  Đã dừng tất cả services" "Green"
}

function Clone-Or-Pull {
    Write-ColorOutput "`n=== Lấy code từ Git ===" "Yellow"

    if (Test-Path $DEPLOY_PATH) {
        Write-ColorOutput "  Thư mục đã tồn tại, đang cập nhật code..." "Cyan"
        Set-Location $DEPLOY_PATH
        git fetch origin
        git reset --hard origin/main
        git pull origin main
    } else {
        Write-ColorOutput "  Đang clone repository..." "Cyan"
        New-Item -ItemType Directory -Path $DEPLOY_PATH -Force | Out-Null
        Set-Location (Split-Path $DEPLOY_PATH -Parent)
        git clone $GIT_REPO $PROJECT_NAME
        Set-Location $DEPLOY_PATH
    }

    Write-ColorOutput "  Code đã được cập nhật" "Green"
}

function Setup-Environment {
    Write-ColorOutput "`n=== Thiết lập biến môi trường ===" "Yellow"

    # Tạo file .env cho microservices
    $microservicesEnv = @"
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Secret (Tạo secret key mạnh hơn)
JWT_SECRET=$(New-Guid)
JWT_REFRESH_SECRET=$(New-Guid)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Services Ports
GATEWAY_PORT=$GATEWAY_PORT
AUTH_SERVICE_PORT=$AUTH_PORT
USER_SERVICE_PORT=$USER_PORT
GIS_SERVICE_PORT=$GIS_PORT
REPORT_SERVICE_PORT=$REPORT_PORT
ADMIN_SERVICE_PORT=$ADMIN_PORT
SEARCH_SERVICE_PORT=$SEARCH_PORT
MAPSERVER_SERVICE_PORT=$MAPSERVER_PORT

# Environment
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:$CLIENT_PORT,http://103.56.161.239
"@

    $microservicesEnv | Out-File -FilePath "$DEPLOY_PATH\microservices\.env" -Encoding UTF8
    Write-ColorOutput "  Đã tạo .env cho microservices" "Green"

    # Tạo file .env cho client
    $clientEnv = @"
VITE_API_URL=http://localhost:$GATEWAY_PORT
VITE_API_TIMEOUT=30000
"@

    $clientEnv | Out-File -FilePath "$DEPLOY_PATH\client\.env" -Encoding UTF8
    Write-ColorOutput "  Đã tạo .env cho client" "Green"
}

function Install-Dependencies {
    Write-ColorOutput "`n=== Cài đặt dependencies ===" "Yellow"

    Set-Location $DEPLOY_PATH

    # Cài đặt root dependencies
    Write-ColorOutput "  Cài đặt root dependencies..." "Cyan"
    npm install

    # Cài đặt microservices dependencies
    Write-ColorOutput "  Cài đặt microservices dependencies..." "Cyan"
    Set-Location "$DEPLOY_PATH\microservices"
    npm install

    # Cài đặt client dependencies
    Write-ColorOutput "  Cài đặt client dependencies..." "Cyan"
    Set-Location "$DEPLOY_PATH\client"
    npm install

    Write-ColorOutput "  Đã cài đặt tất cả dependencies" "Green"
}

function Setup-Database {
    Write-ColorOutput "`n=== Thiết lập database ===" "Yellow"

    # Kiểm tra kết nối database
    $env:PGPASSWORD = $DB_PASSWORD
    $dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | Select-String -Pattern $DB_NAME

    if (-not $dbExists) {
        Write-ColorOutput "  Tạo database mới..." "Cyan"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    } else {
        Write-ColorOutput "  Database đã tồn tại" "Cyan"
    }

    # Chạy migrations nếu có
    if (Test-Path "$DEPLOY_PATH\microservices\migrations") {
        Write-ColorOutput "  Chạy database migrations..." "Cyan"
        Set-Location "$DEPLOY_PATH\microservices"
        # Thêm lệnh chạy migrations ở đây nếu có
    }

    Write-ColorOutput "  Database đã sẵn sàng" "Green"
}

function Build-Frontend {
    Write-ColorOutput "`n=== Build Frontend ===" "Yellow"

    Set-Location "$DEPLOY_PATH\client"
    npm run build

    Write-ColorOutput "  Frontend đã được build" "Green"
}

function Start-Services {
    Write-ColorOutput "`n=== Khởi động services ===" "Yellow"

    Set-Location "$DEPLOY_PATH\microservices"

    # Khởi động các microservices với PM2
    $services = @(
        @{Name="gateway"; Path="gateway"; Script="src/index.js"; Port=$GATEWAY_PORT},
        @{Name="auth-service"; Path="services/auth-service"; Script="src/index.js"; Port=$AUTH_PORT},
        @{Name="user-service"; Path="services/user-service"; Script="src/index.js"; Port=$USER_PORT},
        @{Name="gis-service"; Path="services/gis-service"; Script="src/index.js"; Port=$GIS_PORT},
        @{Name="report-service"; Path="services/report-service"; Script="src/index.js"; Port=$REPORT_PORT},
        @{Name="admin-service"; Path="services/admin-service"; Script="src/index.js"; Port=$ADMIN_PORT},
        @{Name="search-service"; Path="services/search-service"; Script="src/index.js"; Port=$SEARCH_PORT},
        @{Name="mapserver-service"; Path="services/mapserver-service"; Script="src/index.js"; Port=$MAPSERVER_PORT}
    )

    foreach ($service in $services) {
        Write-ColorOutput "  Khởi động $($service.Name) trên port $($service.Port)..." "Cyan"
        pm2 start "$DEPLOY_PATH\microservices\$($service.Path)\$($service.Script)" `
            --name $service.Name `
            --node-args="--max-old-space-size=2048"
    }

    # Khởi động frontend (serve static files)
    Write-ColorOutput "  Khởi động frontend trên port $CLIENT_PORT..." "Cyan"
    pm2 serve "$DEPLOY_PATH\client\dist" $CLIENT_PORT --name "client" --spa

    # Lưu PM2 configuration
    pm2 save

    Write-ColorOutput "  Tất cả services đã khởi động" "Green"
}

function Show-Status {
    Write-ColorOutput "`n=== Trạng thái hệ thống ===" "Yellow"

    pm2 status

    Write-ColorOutput "`n=== Thông tin truy cập ===" "Green"
    Write-ColorOutput "  Frontend: http://103.56.161.239:$CLIENT_PORT" "Cyan"
    Write-ColorOutput "  API Gateway: http://103.56.161.239:$GATEWAY_PORT" "Cyan"
    Write-ColorOutput "  Swagger Docs: http://103.56.161.239:$GATEWAY_PORT/api-docs" "Cyan"

    Write-ColorOutput "`n=== Lệnh quản lý ===" "Yellow"
    Write-ColorOutput "  Xem logs:      pm2 logs" "White"
    Write-ColorOutput "  Dừng services: pm2 stop all" "White"
    Write-ColorOutput "  Khởi động lại: pm2 restart all" "White"
    Write-ColorOutput "  Xóa services:  pm2 delete all" "White"
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

Write-ColorOutput @"

===================================================================
  HỆ THỐNG DEPLOYMENT - DU BÁO MẤT RỪNG
===================================================================

"@ "Cyan"

try {
    # Kiểm tra yêu cầu hệ thống
    Check-Prerequisites

    if ($UpdateOnly) {
        # Chỉ cập nhật code
        Write-ColorOutput "`n=== CHẾ ĐỘ CẬP NHẬT NHANH ===" "Green"
        Stop-Services
        Clone-Or-Pull
        Install-Dependencies
        Build-Frontend
        Start-Services
    } else {
        # Deploy đầy đủ
        if ($FirstTime) {
            Write-ColorOutput "`n=== CHẾ ĐỘ DEPLOYMENT LẦN ĐẦU ===" "Green"
            Setup-Database
        }

        Stop-Services
        Clone-Or-Pull
        Setup-Environment
        Install-Dependencies
        Build-Frontend
        Start-Services
    }

    Show-Status

    Write-ColorOutput "`n=== DEPLOYMENT THÀNH CÔNG! ===" "Green"

} catch {
    Write-ColorOutput "`n=== LỖI TRONG QUÁ TRÌNH DEPLOYMENT ===" "Red"
    Write-ColorOutput $_.Exception.Message "Red"
    Write-ColorOutput $_.ScriptStackTrace "Red"
    exit 1
}
