@echo off
chcp 65001 >nul
title DuBaoMatRung - One Click Deploy

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
    npm install
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
if errorlevel 1 (
    echo ❌ Lỗi build Frontend
    pause
    exit /b 1
)
echo ✅ Build Frontend thành công

REM Quay về thư mục gốc
cd /d "%PROJECT_DIR%"

REM Cài serve nếu chưa có
npm list -g serve >nul 2>&1
if errorlevel 1 (
    echo 📦 Cài đặt serve...
    npm install -g serve
)

REM Tạo thư mục logs
if not exist logs mkdir logs

echo.
echo 🔄 Bước 2: Dừng services cũ (nếu có)...
pm2 stop all >nul 2>&1
pm2 delete all >nul 2>&1

echo.
echo 🚀 Bước 3: Khởi động services...

REM Start Backend
echo 🔧 Khởi động Backend...
pm2 start "%BACKEND_DIR%\server.js" --name "dubaomatrung-backend" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\backend-error.log" --output "%PROJECT_DIR%logs\backend-out.log"

REM Đợi Backend khởi động
timeout /t 3 /nobreak >nul

REM Start Frontend
echo 🎨 Khởi động Frontend...
pm2 start serve --name "dubaomatrung-frontend" -- -s "%FRONTEND_DIR%\dist" -l 5173 --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\frontend-error.log" --output "%PROJECT_DIR%logs\frontend-out.log"

REM Save PM2 config
pm2 save

echo.
echo ==========================================
echo           ✅ DEPLOY THÀNH CÔNG!
echo ==========================================
echo.
echo 🌐 NGƯỜI DÙNG TRUY CẬP TẠI:
echo    Frontend: http://103.56.161.239:5173
echo    Backend:  http://103.56.161.239:3000
echo.
echo 📊 QUẢN LÝ SERVER:
echo    pm2 status     - Xem trạng thái
echo    pm2 logs       - Xem logs
echo    pm2 monit      - Monitor real-time
echo    pm2 restart all - Khởi động lại
echo ==========================================
echo.

REM Hiển thị status
pm2 status

echo.
echo 🎯 Server đang chạy! Nhấn phím bất kỳ để đóng...
pause >nul