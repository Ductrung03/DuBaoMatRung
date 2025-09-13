# Complete Deployment Files - Fixed Version

## 📁 File: `deploy.bat`

```batch
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
if errorlevel 1 (
    echo ❌ Lỗi build Frontend
    pause
    exit /b 1
)
echo ✅ Build Frontend thành công

REM Quay về thư mục gốc
cd /d "%PROJECT_DIR%"

REM Tạo simple-static-server.js nếu chưa có
if not exist simple-static-server.js (
    echo 📝 Tạo simple-static-server.js...
    (
        echo const express = require^('express'^);
        echo const path = require^('path'^);
        echo const app = express^(^);
        echo.
        echo const PORT = 5173;
        echo const DIST_PATH = path.join^(__dirname, 'client', 'dist'^);
        echo.
        echo // Serve static files from dist folder
        echo app.use^(express.static^(DIST_PATH^)^);
        echo.
        echo // Handle SPA routing - return index.html for all non-API routes
        echo app.get^('*', ^(req, res^) =^> {
        echo   res.sendFile^(path.join^(DIST_PATH, 'index.html'^)^);
        echo }^);
        echo.
        echo app.listen^(PORT, '0.0.0.0', ^(^) =^> {
        echo   console.log^(`🎨 Frontend server running on http://0.0.0.0:$${PORT}`^);
        echo   console.log^(`📁 Serving files from: $${DIST_PATH}`^);
        echo }^);
        echo.
        echo // Graceful shutdown
        echo process.on^('SIGINT', ^(^) =^> {
        echo   console.log^('📴 Frontend server shutting down...'^);
        echo   process.exit^(0^);
        echo }^);
        echo.
        echo process.on^('SIGTERM', ^(^) =^> {
        echo   console.log^('📴 Frontend server shutting down...'^);
        echo   process.exit^(0^);
        echo }^);
    ) > simple-static-server.js
    echo ✅ Đã tạo simple-static-server.js
)

REM Tạo webhook-server.js nếu chưa có
if not exist webhook-server.js (
    echo 📝 Tạo webhook-server.js...
    (
        echo const express = require^('express'^);
        echo const { exec } = require^('child_process'^);
        echo const crypto = require^('crypto'^);
        echo const path = require^('path'^);
        echo const app = express^(^);
        echo.
        echo const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ^|^| '';
        echo.
        echo app.use^(express.json^(^)^);
        echo.
        echo function verifySignature^(payload, signature^) {
        echo   if ^(!WEBHOOK_SECRET^) return true;
        echo   const hmac = crypto.createHmac^('sha256', WEBHOOK_SECRET^);
        echo   const digest = 'sha256=' + hmac.update^(payload^).digest^('hex'^);
        echo   return crypto.timingSafeEqual^(Buffer.from^(signature^), Buffer.from^(digest^)^);
        echo }
        echo.
        echo app.post^('/webhook', ^(req, res^) =^> {
        echo   const signature = req.headers['x-hub-signature-256'];
        echo   const payload = JSON.stringify^(req.body^);
        echo   console.log^('🔔 Webhook received from GitHub'^);
        echo   if ^(WEBHOOK_SECRET ^&^& signature ^&^& !verifySignature^(payload, signature^)^) {
        echo     console.log^('❌ Invalid signature'^);
        echo     return res.status^(401^).send^('Invalid signature'^);
        echo   }
        echo   if ^(req.body.ref === 'refs/heads/main'^) {
        echo     console.log^('🚀 Push to main detected, starting auto-update...'^);
        echo     const projectDir = path.dirname^(__filename^);
        echo     const updateScript = path.join^(projectDir, 'update.bat'^);
        echo     exec^(`"$${updateScript}"`, { cwd: projectDir }, ^(error, stdout, stderr^) =^> {
        echo       if ^(error^) {
        echo         console.error^(`❌ Update failed: $${error}`^);
        echo         return res.status^(500^).send^('Update failed'^);
        echo       }
        echo       console.log^(`✅ Update completed:\n$${stdout}`^);
        echo       if ^(stderr^) console.error^(`Warnings: $${stderr}`^);
        echo       res.status^(200^).send^('Update completed successfully'^);
        echo     }^);
        echo   } else {
        echo     console.log^(`ℹ️ Push to $${req.body.ref} - not updating`^);
        echo     res.status^(200^).send^('Push received but not to main branch'^);
        echo   }
        echo }^);
        echo.
        echo app.get^('/status', ^(req, res^) =^> {
        echo   exec^('pm2 jlist', ^(error, stdout, stderr^) =^> {
        echo     if ^(error^) return res.status^(500^).json^({ error: 'Failed to get status' }^);
        echo     try {
        echo       const processes = JSON.parse^(stdout^);
        echo       res.json^({ status: 'running', processes: processes.map^(p =^> ^({ name: p.name, status: p.pm2_env.status, uptime: p.pm2_env.pm_uptime, restarts: p.pm2_env.restart_time, memory: p.pm2_env.memory }^)^) }^);
        echo     } catch ^(e^) { res.status^(500^).json^({ error: 'Failed to parse PM2 output' }^); }
        echo   }^);
        echo }^);
        echo.
        echo const PORT = 9000;
        echo app.listen^(PORT, '0.0.0.0', ^(^) =^> {
        echo   console.log^(`🎣 Webhook server running on port $${PORT}`^);
        echo   console.log^(`📡 Webhook URL: http://103.56.161.239:$${PORT}/webhook`^);
        echo   console.log^(`📊 Status URL: http://103.56.161.239:$${PORT}/status`^);
        echo }^);
    ) > webhook-server.js
    echo ✅ Đã tạo webhook-server.js
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

REM Start Frontend với static server
echo 🎨 Khởi động Frontend...
pm2 start "%PROJECT_DIR%simple-static-server.js" --name "dubaomatrung-frontend" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\frontend-error.log" --output "%PROJECT_DIR%logs\frontend-out.log"

REM Đợi Frontend khởi động
timeout /t 2 /nobreak >nul

REM Start Webhook Server
echo 🎣 Khởi động Webhook Server...
pm2 start "%PROJECT_DIR%webhook-server.js" --name "dubaomatrung-webhook" --log-date-format="YYYY-MM-DD HH:mm:ss" --error "%PROJECT_DIR%logs\webhook-error.log" --output "%PROJECT_DIR%logs\webhook-out.log"

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
pm2 status

echo.
echo 🎯 Server đang chạy! Nhấn phím bất kỳ để đóng...
pause >nul
```

## 📁 File: `update.bat`

```batch
@echo off
chcp 65001 >nul
title DuBaoMatRung - Update Server

echo.
echo ==========================================
echo      🔄 DUBAOMATRUNG