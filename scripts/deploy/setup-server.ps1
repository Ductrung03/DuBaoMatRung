# Script setup trên Windows Server
# Chạy file này SAU KHI đã copy code lên server

param(
    [switch]$SkipDependencies = $false
)

Write-Host "🚀 Setting up DuBaoMatRung on Windows Server..." -ForegroundColor Green
Write-Host ""

# Kiểm tra quyền admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some features may not work." -ForegroundColor Yellow
    Write-Host ""
}

# Bước 1: Kiểm tra dependencies
if (-not $SkipDependencies) {
    Write-Host "1️⃣  Checking dependencies..." -ForegroundColor Cyan

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Node.js not found! Please install from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }

    # Check PostgreSQL
    try {
        $pgVersion = psql --version
        Write-Host "  ✓ PostgreSQL installed" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  PostgreSQL not found in PATH" -ForegroundColor Yellow
    }

    # Check Redis
    $redisRunning = Get-Process redis-server -ErrorAction SilentlyContinue
    if ($redisRunning) {
        Write-Host "  ✓ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Redis not running" -ForegroundColor Yellow
    }

    # Check PM2
    try {
        pm2 --version | Out-Null
        Write-Host "  ✓ PM2 installed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ PM2 not found. Installing..." -ForegroundColor Yellow
        npm install -g pm2
        npm install -g pm2-windows-service
    }

    Write-Host ""
}

# Bước 2: Tạo databases
Write-Host "2️⃣  Setting up databases..." -ForegroundColor Cyan
try {
    $createAuthDb = @"
DO `$`$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db') THEN
      CREATE DATABASE auth_db;
   END IF;
END
`$`$;
"@

    $createGisDb = @"
DO `$`$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gis_db') THEN
      CREATE DATABASE gis_db;
   END IF;
END
`$`$;
"@

    # Thử tạo databases
    Write-Host "  Creating auth_db..." -ForegroundColor Gray
    psql -U postgres -c $createAuthDb 2>$null

    Write-Host "  Creating gis_db..." -ForegroundColor Gray
    psql -U postgres -c $createGisDb 2>$null

    Write-Host "  ✓ Databases ready" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Could not create databases automatically" -ForegroundColor Yellow
    Write-Host "  Please run manually:" -ForegroundColor Yellow
    Write-Host "    psql -U postgres" -ForegroundColor White
    Write-Host "    CREATE DATABASE auth_db;" -ForegroundColor White
    Write-Host "    CREATE DATABASE gis_db;" -ForegroundColor White
}
Write-Host ""

# Bước 3: Install dependencies
Write-Host "3️⃣  Installing dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray

# Root dependencies
if (Test-Path "package.json") {
    Write-Host "  Installing root dependencies..." -ForegroundColor Gray
    npm install --production 2>&1 | Out-Null
}

# Microservices
cd microservices
Write-Host "  Installing microservices dependencies..." -ForegroundColor Gray
npm install --production 2>&1 | Out-Null

# Install all service dependencies
$services = @(
    "gateway",
    "services/auth-service",
    "services/user-service",
    "services/gis-service",
    "services/report-service",
    "services/admin-service",
    "services/search-service",
    "services/mapserver-service"
)

foreach ($service in $services) {
    if (Test-Path $service) {
        Write-Host "  Installing $service..." -ForegroundColor Gray
        Push-Location $service
        npm install --production 2>&1 | Out-Null
        Pop-Location
    }
}

# Shared libraries
if (Test-Path "shared") {
    $sharedLibs = Get-ChildItem -Path "shared" -Directory
    foreach ($lib in $sharedLibs) {
        Write-Host "  Installing shared/$($lib.Name)..." -ForegroundColor Gray
        Push-Location "shared/$($lib.Name)"
        npm install --production 2>&1 | Out-Null
        Pop-Location
    }
}

cd ..
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Bước 4: Prisma setup
Write-Host "4️⃣  Setting up Prisma..." -ForegroundColor Cyan
cd microservices/services/auth-service

if (Test-Path "prisma/schema.prisma") {
    Write-Host "  Generating Prisma Client..." -ForegroundColor Gray
    npx prisma generate 2>&1 | Out-Null

    Write-Host "  Running migrations..." -ForegroundColor Gray
    npx prisma migrate deploy 2>&1 | Out-Null

    Write-Host "  Seeding database..." -ForegroundColor Gray
    npx prisma db seed 2>&1 | Out-Null

    Write-Host "  ✓ Prisma setup complete" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Prisma schema not found" -ForegroundColor Yellow
}

cd ../../..
Write-Host ""

# Bước 5: Build frontend
Write-Host "5️⃣  Building frontend..." -ForegroundColor Cyan
cd client

if (Test-Path "package.json") {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
    npm install 2>&1 | Out-Null

    Write-Host "  Building React app..." -ForegroundColor Gray
    npm run build 2>&1 | Out-Null

    if (Test-Path "dist") {
        Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Build failed or dist folder not created" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Frontend package.json not found" -ForegroundColor Yellow
}

cd ..
Write-Host ""

# Bước 6: Tạo thư mục cần thiết
Write-Host "6️⃣  Creating directories..." -ForegroundColor Cyan
$directories = @(
    "uploads",
    "backups",
    "logs",
    "microservices/gateway/logs",
    "microservices/services/auth-service/logs",
    "microservices/services/user-service/logs",
    "microservices/services/gis-service/logs",
    "microservices/services/report-service/logs",
    "microservices/services/admin-service/logs",
    "microservices/services/search-service/logs",
    "microservices/services/mapserver-service/logs"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Host "  ✓ Directories created" -ForegroundColor Green
Write-Host ""

# Bước 7: Cấu hình .env
Write-Host "7️⃣  Configuring environment..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "  ⚠️  .env created from .env.example" -ForegroundColor Yellow
        Write-Host "  Please update .env with production values!" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  .env not found. Please create it manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✓ .env exists" -ForegroundColor Green
}
Write-Host ""

# Bước 8: Mở firewall (nếu admin)
if ($isAdmin) {
    Write-Host "8️⃣  Configuring firewall..." -ForegroundColor Cyan

    # Check nếu rule đã tồn tại
    $httpRule = Get-NetFirewallRule -DisplayName "HTTP Port 80" -ErrorAction SilentlyContinue
    if (-not $httpRule) {
        New-NetFirewallRule -DisplayName "HTTP Port 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
        Write-Host "  ✓ Opened port 80 (HTTP)" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Port 80 already open" -ForegroundColor Green
    }

    $apiRule = Get-NetFirewallRule -DisplayName "API Gateway Port 3000" -ErrorAction SilentlyContinue
    if (-not $apiRule) {
        New-NetFirewallRule -DisplayName "API Gateway Port 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
        Write-Host "  ✓ Opened port 3000 (API Gateway)" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Port 3000 already open" -ForegroundColor Green
    }

    Write-Host ""
}

# Bước 9: Start services với PM2
Write-Host "9️⃣  Starting services..." -ForegroundColor Cyan

# Delete old PM2 processes
pm2 delete all 2>$null | Out-Null

# Start tất cả services
pm2 start ecosystem.config.js

Write-Host ""
Write-Host "  Waiting for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Show status
pm2 status

Write-Host ""

# Bước 10: Save PM2 config
Write-Host "🔟 Saving PM2 configuration..." -ForegroundColor Cyan
pm2 save

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update .env with production values" -ForegroundColor White
Write-Host "   - Database credentials" -ForegroundColor Gray
Write-Host "   - JWT secrets" -ForegroundColor Gray
Write-Host "   - Redis configuration" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Install & configure Nginx (optional)" -ForegroundColor White
Write-Host "   Download: https://nginx.org/en/download.html" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup PM2 auto-startup (run as admin):" -ForegroundColor White
Write-Host "   pm2-startup install" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test the application:" -ForegroundColor White
Write-Host "   API: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173 (dev) or setup Nginx" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation: DEPLOY_WINDOWS_SERVER.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Yellow
Write-Host "   pm2 status          - View all services" -ForegroundColor White
Write-Host "   pm2 logs            - View all logs" -ForegroundColor White
Write-Host "   pm2 restart all     - Restart all services" -ForegroundColor White
Write-Host "   pm2 stop all        - Stop all services" -ForegroundColor White
Write-Host ""
