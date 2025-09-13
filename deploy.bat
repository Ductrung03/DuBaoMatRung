@echo off
chcp 65001 >nul
title DuBaoMatRung - One Click Deploy (DEBUG)

echo.
echo ==========================================
echo    🚀 DUBAOMATRUNG AUTO START SERVER
echo ==========================================
echo.

set PROJECT_DIR=%~dp0
set BACKEND_DIR=%PROJECT_DIR%server
set FRONTEND_DIR=%PROJECT_DIR%client

echo 📍 Dự án tại: %PROJECT_DIR%
echo.

echo 🔧 Bước 1: Kiểm tra và cài đặt dependencies...
echo.

REM Kiểm tra Backend
cd /d "%BACKEND_DIR%"
if not exist node_modules (
    echo 📦 Cài đặt Backend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Lỗi cài đặt Backend
        pause
        exit /b 1
    )
) else (
    echo ✅ Backend dependencies đã có
)

REM Tạo .env cho backend nếu chưa có
if not exist .env (
    echo 📝 Tạo file .env cho Backend...
    (
        echo PGHOST=localhost
        echo PGPORT=5432
        echo PGUSER=postgres
        echo PGPASSWORD=4
        echo PGDATABASE=geodb
        echo GEOSERVER_USER=admin
        echo GEOSERVER_PASS=geoserver
        echo JWT_SECRET=dubaomatrung_secret_key_change_this_in_production
        echo PORT=3000
        echo HOST=0.0.0.0
    ) > .env
    echo ✅ Đã tạo .env cho Backend
)

REM Kiểm tra Frontend
cd /d "%FRONTEND_DIR%"
if not exist node_modules (
    echo 📦 Cài đặt Frontend dependencies...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ❌ Lỗi cài đặt Frontend
        pause
        exit /b 1
    )
) else (
    echo ✅ Frontend dependencies đã có
)

REM Tạo .env cho frontend nếu chưa có
if not exist .env (
    echo 📝 Tạo file .env cho Frontend...
    echo VITE_API_URL=http://103.56.161.239:3000 > .env
    echo ✅ Đã tạo .env cho Frontend
)

REM Build Frontend
echo 🏗️ Building Frontend...
npm run build
echo 🔍 DEBUG: Build completed with exit code: %ERRORLEVEL%
if errorlevel 1 (
    echo ❌ Lỗi build Frontend
    pause
    exit /b 1
)
echo ✅ Build Frontend thành công
echo 🔍 DEBUG: Moving to project directory...

REM Quay về thư mục gốc
cd /d "%PROJECT_DIR%"
echo 🔍 DEBUG: Current directory: %CD%

REM Tạo thư mục logs
if not exist logs mkdir logs
echo 🔍 DEBUG: Logs directory created/exists

echo.
echo 🔄 Bước 2: Dừng services cũ (nếu có)...
echo 🔍 DEBUG: About to stop PM2 services...
pm2 stop all >nul 2>&1
pm2 delete all >nul 2>&1
echo 🔍 DEBUG: PM2 services stopped and deleted

echo.
echo 🚀 Bước 3: Khởi động services...
echo 🔍 DEBUG: About to start services...

REM Start Backend
echo 🔧 Khởi động Backend...
echo 🔍 DEBUG: Backend path: "%BACKEND_DIR%\server.js"
pm2 start "%BACKEND_DIR%\server.js" --name "dubaomatrung-backend" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\backend-error.log" --output "%PROJECT_DIR%logs\backend-out.log"
echo 🔍 DEBUG: Backend started with exit code: %ERRORLEVEL%

REM Đợi Backend khởi động
echo 🔍 DEBUG: Waiting 3 seconds for backend...
timeout /t 3 /nobreak >nul

REM Start Frontend với static server
echo 🎨 Khởi động Frontend...
echo 🔍 DEBUG: Static server path: "%PROJECT_DIR%simple-static-server.js"
pm2 start "%PROJECT_DIR%simple-static-server.js" --name "dubaomatrung-frontend" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\frontend-error.log" --output "%PROJECT_DIR%logs\frontend-out.log"
echo 🔍 DEBUG: Frontend started with exit code: %ERRORLEVEL%

REM Đợi Frontend khởi động
echo 🔍 DEBUG: Waiting 2 seconds for frontend...
timeout /t 2 /nobreak >nul

REM Start Webhook Server
echo 🎣 Khởi động Webhook Server...
echo 🔍 DEBUG: Webhook path: "%PROJECT_DIR%webhook-server.js"
pm2 start "%PROJECT_DIR%webhook-server.js" --name "dubaomatrung-webhook" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\webhook-error.log" --output "%PROJECT_DIR%logs\webhook-out.log"
echo 🔍 DEBUG: Webhook started with exit code: %ERRORLEVEL%

REM Save PM2 config
echo 🔍 DEBUG: Saving PM2 configuration...
pm2 save
echo 🔍 DEBUG: PM2 config saved with exit code: %ERRORLEVEL%

echo.
echo ==========================================
echo           ✅ DEPLOY THÀNH CÔNG!
echo ==========================================
echo.
echo 🌐 NGƯỜI DÙNG TRUY CẬP TẠI:
echo    Frontend: http://103.56.161.239:5173
echo    Backend:  http://103.56.161.239:3000
echo    Webhook:  http://103.56.161.239:9000
echo.
echo 📊 QUẢN LÝ SERVER:
echo    pm2 status     - Xem trạng thái
echo    pm2 logs       - Xem logs
echo    pm2 monit      - Monitor real-time
echo    pm2 restart all - Khởi động lại
echo.
echo 🔗 GITHUB WEBHOOK SETUP:
echo    URL: http://103.56.161.239:9000/webhook
echo    Content-Type: application/json
echo    Events: Just the push event
echo ==========================================
echo.

REM Hiển thị status
echo 🔍 DEBUG: Showing PM2 status...
pm2 status

echo.
echo 🎯 Server đang chạy! Nhấn phím bất kỳ để đóng...
pause >nul