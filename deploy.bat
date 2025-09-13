@echo off
echo ========================================
echo 🚀 DUBAOMATRUNG AUTO DEPLOY SCRIPT
echo ========================================

:: Set variables
set PROJECT_DIR=C:\dubaomatrung
set REPO_URL=https://github.com/Ductrung03/DuBaoMatRung.git
set BACKEND_DIR=%PROJECT_DIR%\server
set FRONTEND_DIR=%PROJECT_DIR%\client

:: Colors for output
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set NC=[0m

echo %YELLOW%📦 Bước 1: Tạo thư mục dự án...%NC%
if not exist %PROJECT_DIR% (
    mkdir %PROJECT_DIR%
    echo %GREEN%✅ Đã tạo thư mục %PROJECT_DIR%%NC%
) else (
    echo %GREEN%✅ Thư mục đã tồn tại%NC%
)

cd /d %PROJECT_DIR%

echo %YELLOW%📡 Bước 2: Clone/Pull code từ Git...%NC%
if not exist .git (
    git clone %REPO_URL% .
    echo %GREEN%✅ Clone repository thành công%NC%
) else (
    git pull origin main
    echo %GREEN%✅ Pull code mới thành công%NC%
)

echo %YELLOW%🔧 Bước 3: Setup Backend...%NC%
cd /d %BACKEND_DIR%

:: Copy .env cho backend
if not exist .env (
    echo PGHOST=localhost> .env
    echo PGPORT=5432>> .env
    echo PGUSER=postgres>> .env
    echo PGPASSWORD=4>> .env
    echo PGDATABASE=geodb>> .env
    echo GEOSERVER_USER=admin>> .env
    echo GEOSERVER_PASS=geoserver>> .env
    echo JWT_SECRET=dubaomatrung_secret_key_change_this_in_production>> .env
    echo PORT=3000>> .env
    echo HOST=0.0.0.0>> .env
    echo %GREEN%✅ Đã tạo file .env cho backend%NC%
)

:: Install dependencies
npm install
if %errorlevel% neq 0 (
    echo %RED%❌ Lỗi cài đặt dependencies backend%NC%
    exit /b 1
)
echo %GREEN%✅ Cài đặt dependencies backend thành công%NC%

echo %YELLOW%🎨 Bước 4: Setup Frontend...%NC%
cd /d %FRONTEND_DIR%

:: Copy .env cho frontend  
if not exist .env (
    echo VITE_API_URL=http://103.56.161.239:3000> .env
    echo %GREEN%✅ Đã tạo file .env cho frontend%NC%
)

:: Install dependencies và build
npm install
if %errorlevel% neq 0 (
    echo %RED%❌ Lỗi cài đặt dependencies frontend%NC%
    exit /b 1
)

npm run build
if %errorlevel% neq 0 (
    echo %RED%❌ Lỗi build frontend%NC%
    exit /b 1
)
echo %GREEN%✅ Build frontend thành công%NC%

echo %YELLOW%⚙️ Bước 5: Cấu hình PM2...%NC%
cd /d %PROJECT_DIR%

:: Tạo ecosystem.config.js
(
echo module.exports = {
echo   apps: [
echo     {
echo       name: 'dubaomatrung-backend',
echo       script: './server/server.js',
echo       cwd: '%PROJECT_DIR%',
echo       instances: 1,
echo       autorestart: true,
echo       watch: false,
echo       max_memory_restart: '1G',
echo       env: {
echo         NODE_ENV: 'production',
echo         PORT: 3000
echo       },
echo       error_file: './logs/backend-err.log',
echo       out_file: './logs/backend-out.log',
echo       log_file: './logs/backend-combined.log',
echo       time: true
echo     },
echo     {
echo       name: 'dubaomatrung-frontend',
echo       script: 'serve',
echo       args: '-s dist -l 5173',
echo       cwd: '%FRONTEND_DIR%',
echo       instances: 1,
echo       autorestart: true,
echo       watch: false,
echo       max_memory_restart: '512M',
echo       env: {
echo         NODE_ENV: 'production'
echo       },
echo       error_file: './logs/frontend-err.log',
echo       out_file: './logs/frontend-out.log',
echo       log_file: './logs/frontend-combined.log',
echo       time: true
echo     }
echo   ]
echo };
) > ecosystem.config.js

:: Tạo thư mục logs
if not exist logs mkdir logs

:: Cài serve globally nếu chưa có
npm list -g serve >nul 2>&1 || npm install -g serve

echo %YELLOW%🚀 Bước 6: Start services với PM2...%NC%

:: Stop các service cũ (nếu có)
pm2 stop ecosystem.config.js >nul 2>&1
pm2 delete ecosystem.config.js >nul 2>&1

:: Start services mới
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo %GREEN%
echo ========================================
echo ✅ DEPLOY THÀNH CÔNG!
echo ========================================
echo 🌐 Backend: http://localhost:3000
echo 🎨 Frontend: http://localhost:5173
echo 📊 PM2 Dashboard: pm2 monit
echo 📝 Logs: pm2 logs
echo ========================================
echo %NC%

:: Hiển thị status
pm2 status