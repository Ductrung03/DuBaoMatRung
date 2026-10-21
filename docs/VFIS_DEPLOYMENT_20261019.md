# Triển khai VFIS ngày 19/10/2026

## Kết quả

Đã đưa bản tích hợp từ `review/vfis-t10-2026` (nền `371f39f1`) vào ứng dụng
`C:\DuBaoMatRung`. Không merge/commit/push vào main; không thay database bằng bản thử.
Báo cáo này bổ sung kết quả sau báo cáo kiểm tra ban đầu `VFIS_SERVER_REVIEW_20261019.md`.

## Phân quyền kế thừa, không cấp thêm quyền

- Công ty Fis, Chi cục kiểm lâm, super_admin/admin: phạm vi toàn tỉnh theo chính sách hiện hành.
- Hạt kiểm lâm và Kiểm lâm viên: phạm vi xã đang lưu trong tài khoản; tiếp tục hỗ trợ giới hạn tiểu khu/khoảnh.
- Giám sát mới dùng quyền tra cứu `data_management.forecast_search`; xử lý ảnh giữ quyền detection riêng.
- Xác minh/cập nhật/báo cáo giữ từng quyền tương ứng; vai trò toàn tỉnh không tự trở thành quản trị hệ thống.
- 85 tài khoản đã kiểm tra API: 7 tài khoản toàn tỉnh, 77 tài khoản có địa bàn hợp lệ;
  riêng `HatKiemLam` (ID 30) thiếu địa bàn nên trả 403, không được mặc định xem toàn tỉnh.
- Quyền/phạm vi được lấy lại từ database; JWT/header giả hoặc quyền cũ không được dùng để nâng quyền.
- Chính sách hình học bảo thủ: chỉ trả cảnh báo nằm trọn trong địa bàn được cấp;
  không tự cắt hình hoặc suy diễn phần diện tích của lô vượt biên.

## Các sửa lỗi tích hợp chính

- Nhận đúng trạng thái Mới phát hiện của dữ liệu hiện tại, không đổi trạng thái trong database.
- Giữ Ảnh kỳ đầu / Ảnh kỳ cuối; ngày thu nhận độc lập với kỳ thống kê end_sau.
- Sửa giải mã base64url/UTF-8 trong HTML để không xóa token hợp lệ chứa dữ liệu tiếng Việt.
- Request tiến độ clip gửi token; không tự bật clip-worker đang dừng.
- Áp phạm vi lên API GIS recent, thống kê/forecast Kysely, lớp dữ liệu và cache.
- Kiểm tra quyền/phạm vi trước cập nhật/xác minh từng lô hoặc danh sách lô; kiểm tra mã lô nghiêm ngặt.
- Giữ diện tích xác minh bằng 0; không ép 0 thành null hay diện tích cảnh báo.
- MapServer xử lý PNG dạng Buffer, chọn mapfile Windows phù hợp và dùng namespace cache mới.
- Lớp hiện trạng rừng tải khi bật, mặc định tắt để tránh chờ WMS lớn; có thanh điều chỉnh độ đậm.

## Đã xác nhận

- 26/26 bài `npm run test:vfis` đạt trên cây production; build frontend đạt.
- Browser fixture: quản lý/người dùng, chọn lô, biểu đồ, Excel/DOCX/PDF/GeoJSON và mobile đạt.
- Native gateway/search + PostgreSQL bản sao: ma trận 85 tài khoản đạt; thử sửa dữ liệu
  chỉ trên lô fixture, chặn thao tác ngoài địa bàn, giữ diện tích xác minh bằng 0.
- Browser dữ liệu bản sao: quản trị/FIS/Chi cục tải 5.300 lô, trong đó có 3 fixture riêng;
  Hạt kiểm lâm mẫu chỉ tải/xuất 40 lô trong xã, không bị giới hạn theo trang hiển thị.
- Production browser qua Nginx port 80: các nhóm quản trị/FIS/Chi cục/Hạt/Kiểm lâm viên
  mở giám sát theo quyền; báo cáo của nhóm được phép và mobile hoạt động.
- Production Hạt mẫu: GeoJSON 40 lô; API GIS cũ và lớp cảnh báo chỉ trả các gid trong cùng phạm vi.
- Các route cũ tra cứu, xử lý ảnh, dự báo, quản lý người dùng và role mở được bằng tài khoản quản trị.
- Lượt browser production cuối: không page error hoặc HTTP API >=400 bất ngờ.
- Tám dịch vụ health HTTP 200/PM2 online; clip-worker giữ stopped; PM2 đã save.
- SHA-256 các file phát hành khớp manifest. Checksum nguyên dòng trước/sau của cảnh báo,
  lịch sử, bảng kê xử lý ảnh, User, Role, Permission, UserRole, RolePermission khớp.
  Giữ nguyên 5.297 cảnh báo và 85 tài khoản, bao gồm thay đổi nghiệp vụ hợp lệ trước triển khai.

## Giới hạn chưa nghiệm thu toàn bộ

- Browser kiểm tra bằng phiên JWT hợp lệ; không thay mật khẩu hoặc chạy thao tác ghi trên production.
- Nguồn basemap/GEE ngoài bị loại khỏi browser automation; ảnh lịch sử thật/GEE/Drive,
  quan hệ lô rừng, phân loại chính thức và mẫu báo cáo ký duyệt vẫn cần nguồn thực tế.
- Mở được route xử lý ảnh/dự báo không đồng nghĩa đã nghiệm thu mọi quy trình nhập/xử lý đầu cuối.
- WMS vùng lớn và truy vấn toàn tỉnh còn tốn thời gian; chưa cam kết tốc độ trên mọi đường truyền.
- Không tự nâng dependency hoặc chạy audit fix; các cảnh báo audit cần xử lý riêng.

## Sao lưu và phục hồi

Bằng chứng/dump/manifest riêng: `C:\Users\Administrator\AppData\Local\Temp\2\opencode\vfis-deploy-approved-20261019`.
Giữ nguyên các bản sao lưu cũ. Runtime có 58 file trong manifest và một bổ sung tài liệu
triển khai; amendment kiểm tra mã lô được lưu riêng. Rollback ứng dụng dựa trên từng file
đã sao lưu; không phục hồi database tự động, không ghi đè dữ liệu nghiệp vụ mới.

Ứng dụng: `http://103.56.160.66/`. Người dùng cần Ctrl+F5 để tải frontend mới.
