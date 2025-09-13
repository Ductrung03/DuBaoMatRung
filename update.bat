@echo off
chcp 65001 >nul
title DuBaoMatRung - Update Server

echo.
echo ==========================================
echo      🔄 DUBAOMATRUNG UPDATE SERVER
echo ==========================================
echo.

set PROJECT_DIR=%~dp0
set FRONTEND_DIR=%PROJECT_DIR%client

echo 📍 Dự án tại: %PROJECT_DIR%
echo.

echo ⏹️ Bước 1: Dừng services tạm thời...
pm2 stop all

echo.
echo 📡 Bước 2: Pull code mới từ Git...
git pull origin main
if errorlevel 1 (
    echo ❌ Lỗi pull code. Khởi động lại services cũ...
    pm2 start all
    pause
    exit /b 1
)
echo ✅ Pull code thành công

echo.
echo 🔧 Bước 3: Kiểm tra và update dependencies...

REM Kiểm tra Backend có thay đổi package.json không
git diff HEAD~1 server/package.json >nul 2>&1
if not errorlevel 1 (
    echo 📦 Backend package.json thay đổi, updating...
    cd /d "%PROJECT_DIR%server"
    npm install
    cd /d "%PROJECT_DIR%"
)

REM Kiểm tra Frontend có thay đổi package.json không  
git diff HEAD~1 client/package.json >nul 2>&1
if not errorlevel 1 (
    echo 📦 Frontend package.json thay đổi, updating...
    cd /d "%FRONTEND_DIR%"
    npm install
    cd /d "%PROJECT_DIR%"
)

echo.
echo 🏗️ Bước 4: Build lại Frontend...
cd /d "%FRONTEND_DIR%"
npm run build
if errorlevel 1 (
    echo ❌ Lỗi build Frontend
    cd /d "%PROJECT_DIR%"
    pm2 start all
    pause
    exit /b 1
)
cd /d "%PROJECT_DIR%"
echo ✅ Build Frontend thành công

echo.
echo 🚀 Bước 5: Khởi động lại services...
pm2 restart all
pm2 save

echo.
echo ==========================================
echo          ✅ UPDATE THÀNH CÔNG!
echo ==========================================
echo.
echo 🌐 NGƯỜI DÙNG TRUY CẬP TẠI:
echo    Frontend: http://103.56.161.239:5173
echo    Backend:  http://103.56.161.239:3000
echo ==========================================
echo.

pm2 status

echo.
echo 🎯 Update hoàn tất! Nhấn phím bất kỳ để đóng...
pause >nul