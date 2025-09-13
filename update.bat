@echo off
echo ========================================
echo 🔄 DUBAOMATRUNG AUTO UPDATE SCRIPT  
echo ========================================

:: Set variables
set PROJECT_DIR=C:\dubaomatrung
set BACKEND_DIR=%PROJECT_DIR%\server
set FRONTEND_DIR=%PROJECT_DIR%\client

:: Colors
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set NC=[0m

echo %YELLOW%⏹️ Bước 1: Dừng services...%NC%
pm2 stop ecosystem.config.js
echo %GREEN%✅ Đã dừng services%NC%

echo %YELLOW%📡 Bước 2: Pull code mới từ Git...%NC%
cd /d %PROJECT_DIR%
git stash
git pull origin main
if %errorlevel% neq 0 (
    echo %RED%❌ Lỗi pull code%NC%
    pm2 start ecosystem.config.js
    exit /b 1
)
echo %GREEN%✅ Pull code thành công%NC%

echo %YELLOW%🔧 Bước 3: Update Backend...%NC%
cd /d %BACKEND_DIR%

:: Kiểm tra xem có thay đổi package.json không
git diff HEAD~1 package.json > nul
if %errorlevel% equ 0 (
    echo %YELLOW%📦 Detected package.json changes, updating dependencies...%NC%
    npm install
)
echo %GREEN%✅ Backend updated%NC%

echo %YELLOW%🎨 Bước 4: Update & Build Frontend...%NC%
cd /d %FRONTEND_DIR%

:: Kiểm tra thay đổi package.json
git diff HEAD~1 package.json > nul  
if %errorlevel% equ 0 (
    echo %YELLOW%📦 Detected package.json changes, updating dependencies...%NC%
    npm install
)

:: Build lại frontend
npm run build
if %errorlevel% neq 0 (
    echo %RED%❌ Lỗi build frontend%NC%
    exit /b 1
)
echo %GREEN%✅ Frontend built successfully%NC%

echo %YELLOW%🚀 Bước 5: Restart services...%NC%
cd /d %PROJECT_DIR%
pm2 start ecosystem.config.js
pm2 save

echo %GREEN%
echo ========================================
echo ✅ UPDATE THÀNH CÔNG!  
echo ========================================
echo 🌐 Backend: http://localhost:3000
echo 🎨 Frontend: http://localhost:5173
echo 📊 Status: pm2 status
echo ========================================
echo %NC%

:: Hiển thị status và logs
pm2 status
echo.
echo %YELLOW%📝 Recent logs:%NC%
pm2 logs --lines 10