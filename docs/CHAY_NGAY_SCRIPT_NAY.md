# ⚡ CHẠY NGAY SCRIPT NÀY ĐỂ SỬA LỖI WEB

## 🎯 MỤC ĐÍCH
Sửa lỗi 500 và timeout trên web http://103.56.160.66:3000 trong **5 PHÚT**

---

## 📋 CHUẨN BỊ (2 PHÚT)

### Bước 1: Copy folder lên server

**Trên máy LOCAL (máy hiện tại):**

1. Mở **Remote Desktop Connection** (mstsc)
2. Kết nối tới: `103.56.160.66`
3. Login với tài khoản Administrator

**Trong Remote Desktop:**

4. Copy toàn bộ folder **`server-fix-package`** từ máy LOCAL
5. Paste vào **`C:\DuBaoMatRung\`** trên server

Kết quả: Bạn sẽ có `C:\DuBaoMatRung\server-fix-package\` trên server

---

## ⚡ CHẠY SCRIPT (1 LỆNH - 3 PHÚT)

**Trên SERVER, mở PowerShell:**

```powershell
# Vào thư mục chứa script
cd C:\DuBaoMatRung

# Chạy script tự động deploy
.\AUTO_DEPLOY_ON_SERVER.ps1
```

**Script sẽ tự động:**
- ✓ Kiểm tra môi trường (PM2, PostgreSQL)
- ✓ Backup frontend cũ
- ✓ Deploy frontend mới (timeout 60s)
- ✓ Fix database (tạo table nguyen_nhan)
- ✓ Restart PM2 services
- ✓ Hiển thị kết quả

**Nếu được hỏi password PostgreSQL:** Nhập password database của bạn

---

## ✅ KIỂM TRA (30 GIÂY)

**Mở browser trên BẤT KỲ MÁY NÀO:**

1. Vào: http://103.56.160.66:3000
2. **Bấm Ctrl + F5** để clear cache
3. Login vào hệ thống
4. Vào **Quản lý người dùng**
5. Kiểm tra:
   - ✓ Dropdowns có load dữ liệu?
   - ✓ Không còn lỗi 500?
   - ✓ Không còn timeout?

**Nếu OK → XONG! 🎉**

---

## 🔧 NẾU SCRIPT BÁO LỖI

### Lỗi: "Không tìm thấy frontend-deploy.zip"

**Nguyên nhân:** Chưa copy folder `server-fix-package` vào server

**Cách sửa:**
```powershell
# Kiểm tra folder có đúng không
dir C:\DuBaoMatRung\server-fix-package\
# Phải thấy file frontend-deploy.zip
```

### Lỗi: "PM2 not found"

**Cách sửa:**
```powershell
npm install -g pm2
```

### Lỗi: "PostgreSQL not found"

**Không sao!** Script sẽ bỏ qua bước fix database và chỉ deploy frontend.

Database đã có sẵn dữ liệu nên không cần fix nữa.

### Lỗi: "Access denied" hoặc "Permission denied"

**Cách sửa:** Chạy PowerShell **As Administrator**

1. Tìm PowerShell trong Start menu
2. Right-click → "Run as administrator"
3. Chạy lại script

---

## 🚨 NẾU SCRIPT CHẠY XONG NHƯNG VẪN LỖI

### Kiểm tra PM2 services

```powershell
pm2 status
```

**Nếu thấy service "stopped" hoặc "errored":**

```powershell
pm2 restart all
pm2 logs gateway --lines 20
```

### Hard refresh browser

```
Ctrl + F5        # Windows/Linux
Cmd + Shift + R  # Mac
```

### Xóa cache browser

```
F12 → Application → Clear storage → Clear site data
```

---

## 📞 VẪN KHÔNG ĐƯỢC?

Chạy lệnh này và gửi kết quả cho tôi:

```powershell
pm2 logs --lines 50 > logs.txt
notepad logs.txt
```

Hoặc test API trực tiếp:

```powershell
curl http://localhost:3000/api/dropdown/nguyennhan
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi chạy script:

✅ Web load bình thường
✅ Không còn lỗi 500
✅ Không còn timeout
✅ Tất cả dropdowns hiển thị dữ liệu
✅ Trang quản lý người dùng hoạt động

**Thời gian:** < 5 phút

---

## 📝 GHI CHÚ

- File `AUTO_DEPLOY_ON_SERVER.ps1` đã tự động backup frontend cũ
- Nếu có vấn đề, có thể rollback bằng cách restore từ folder `dist_backup_*`
- Script an toàn, không xóa dữ liệu quan trọng

---

**🚀 Chúc bạn thành công!**
