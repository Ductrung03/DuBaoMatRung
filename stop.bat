@echo off
chcp 65001 >nul
title DuBaoMatRung - Stop Server

echo.
echo ==========================================
echo      ⏹️ DUBAOMATRUNG STOP SERVER
echo ==========================================
echo.

echo 🛑 Đang dừng tất cả services...
pm2 stop all

echo 🗑️ Xóa tất cả processes...
pm2 delete all

echo 💾 Lưu cấu hình PM2...
pm2 save

echo.
echo ==========================================
echo           ✅ ĐÃ DỪNG SERVER!
echo ==========================================
echo.
echo 📊 Trạng thái hiện tại:
pm2 status

echo.
echo 🎯 Server đã dừng! Nhấn phím bất kỳ để đóng...
pause >nul