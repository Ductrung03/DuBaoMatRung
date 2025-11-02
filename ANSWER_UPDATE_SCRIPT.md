# ❓ Câu Hỏi: update.ps1 có tự động git pull không?

## ✅ Câu Trả Lời

### Trước khi cập nhật (Cũ):
❌ **KHÔNG tự động git pull**
- Bạn phải tự `git pull` trước
- Sau đó chạy `.\update.ps1 -AutoDetect`

### Sau khi cập nhật (Mới):
✅ **CÓ option tự động git pull**
- Thêm option `-Pull`
- Tự động pull code và detect changes

---

## 🚀 Cách Sử Dụng (Đã Cập Nhật)

### Cách 1: Pull + Auto-detect (KHUYẾN NGHỊ) ⭐

```powershell
.\update.ps1 -Pull
```

**Script sẽ tự động:**
1. Git pull code mới
2. Detect files thay đổi
3. Chỉ rebuild services bị ảnh hưởng

**→ Đây là cách NHANH và TIỆN nhất!**

---

### Cách 2: Tự pull, sau đó auto-detect

```powershell
# Bạn tự pull
git pull

# Sau đó chạy auto-detect
.\update.ps1 -AutoDetect
```

---

### Cách 3: Pull manual, update manual

```powershell
# 1. Pull code
git pull

# 2. Update service cụ thể
.\update.ps1 -Services client,auth-service
```

---

## 📊 So Sánh

| Cách | Lệnh | Auto Pull | Auto Detect | Khuyến nghị |
|------|------|-----------|-------------|-------------|
| **1. Pull + Auto** | `.\update.ps1 -Pull` | ✅ | ✅ | ⭐ KHUYẾN NGHỊ |
| 2. Auto detect only | `.\update.ps1 -AutoDetect` | ❌ | ✅ | - |
| 3. Manual | `.\update.ps1 -Services ...` | ❌ | ❌ | - |
| 4. Pull manual first | `git pull && .\update.ps1 -AutoDetect` | Manual | ✅ | - |

---

## 💡 Workflow Khuyến Nghị

### Khi cần update code trên server:

```powershell
cd C:\DuBaoMatRung

# Chỉ cần 1 lệnh này!
.\update.ps1 -Pull

# Script tự động:
# - Pull code mới từ git
# - Detect files thay đổi
# - Rebuild chỉ services cần thiết
# - Restart services

# Done! 🎉
```

**Thời gian:** 1-3 phút (nhanh hơn rebuild all 5-10 lần!)

---

## 🆚 So Sánh Trước vs Sau

### Trước (Phải làm 2 bước):
```powershell
# Bước 1: Pull manual
git pull

# Bước 2: Update
.\update.ps1 -AutoDetect
```

### Sau (Chỉ 1 bước): ⭐
```powershell
.\update.ps1 -Pull
```

**→ Đơn giản hơn, nhanh hơn!**

---

## 📖 Tất Cả Options

```powershell
# Pull + auto-detect (KHUYẾN NGHỊ)
.\update.ps1 -Pull

# Chỉ auto-detect (không pull)
.\update.ps1 -AutoDetect

# Update service cụ thể
.\update.ps1 -Services client
.\update.ps1 -Services client,auth-service,gateway

# Rebuild tất cả
.\update.ps1 -All

# Interactive mode (chọn từ menu)
.\update.ps1

# Xem help
.\update.ps1 -Help
```

---

## ✅ Kết Luận

### ❓ "update.ps1 có tự pull không?"

**CÂU TRẢ LỜI:**
- ✅ **CÓ** - Dùng option `-Pull` (đã thêm mới)
- ⭐ **KHUYẾN NGHỊ:** `.\update.ps1 -Pull`

### Workflow chuẩn:
```powershell
# Trên server Windows
cd C:\DuBaoMatRung
.\update.ps1 -Pull
```

**Done!** Script tự động pull code và update services cần thiết.

---

**Updated:** 2025-01-02
**Version:** 2.0
