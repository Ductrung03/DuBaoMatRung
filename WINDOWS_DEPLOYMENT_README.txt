====================================================================
HƯỚNG DẪN DEPLOY TRÊN WINDOWS SERVER
====================================================================

BẠN CÓ 2 FILES:
1. windows-deployment.tar.gz    - Main package (nhỏ)
2. admin-db.sql.gz              - Database lớn (2.4GB)

CÁCH CÀI ĐẶT:
=============

1. Copy 2 files vào Windows Server (vào thư mục C:\Projects\DuBaoMatRung)

2. Extract files:

   # Cài 7-Zip hoặc WinRAR trước
   # Hoặc dùng PowerShell:
   
   tar -xzf windows-deployment.tar.gz
   gunzip admin-db.sql.gz

3. Di chuyển admin-db.sql vào đúng vị trí:

   move admin-db.sql docker-init\admin-postgis\01-admin-db.sql

4. Deploy với Docker:

   .\deploy.ps1 -FirstTime

CHÚ Ý:
======
- Cần Docker Desktop đã cài và đang chạy
- Cần tối thiểu 8GB RAM
- First deployment mất 10-20 phút

Chi tiết xem file: DEPLOYMENT_GUIDE.md
