# Kết quả cập nhật Windows/PM2 — 17/10/2026

Đã đưa bản tích hợp từ `review/vfis-ui-workflow` (`da317d63`) vào `C:\DuBaoMatRung`, giữ các chỉnh sửa local đã đối chiếu. Không commit hoặc push thay người dùng.

## Dữ liệu vận hành sau cập nhật

- 5.297 cảnh báo, không thay đổi tổng số.
- 5.011 Mới phát hiện (trước đây Chưa xác minh), 286 Đã xác minh.
- Không có bản ghi Từ chối/Đã xử lý tại thời điểm nâng cấp. Quy tắc đã được duyệt vẫn được thực thi trong migration và kiểm thử bằng dữ liệu cách ly: Từ chối → Mới phát hiện, Đã xử lý cũ → Đã xác minh.
- Chuyển trạng thái cũ chỉ chạy một lần và giữ `legacy_status`.
- Giữ đủ 85 tài khoản. Không seed hoặc đổi mật khẩu tài khoản vận hành.
- Lịch sử nghiệp vụ mới vẫn 0 sau các kiểm tra đọc trên production; không chèn fixture vào hệ thống vận hành.

## Kiểm chứng

- 24/24 unit test đạt; frontend production build thành công.
- 7 nhóm native API/database acceptance đạt trên bản sao, bao gồm migration chạy lại, scope, workflow, xung đột, số 0, nhập/bulk, ảnh theo metadata, PDF/DOCX Windows và giao dịch phân quyền rollback khi lỗi.
- Edge staging: đăng nhập/đăng xuất thật, 5 trang ở 1440/390 px, tải/đọc XLSX, ảnh kỳ đầu/cảnh báo và tra cứu ảnh; không có lỗi JavaScript.
- Production: cả 8 service health 200, auth/GIS ready 200, API qua Nginx, cây quyền mới, xuất PDF, chặn API cũ và WMS có cookie trả PNG thật đều đạt.
- Edge production: 5 trang tải được dữ liệu, không có lỗi JavaScript hoặc HTTP API >=400 trong lượt kiểm tra chỉ đọc.
- Clip-worker giữ trạng thái dừng như trước cập nhật.

## Khắc phục lỗi khởi động nguội

Các service gặp một file dependency có sẵn không đọc được: `shared/logger/node_modules/winston/lib/winston/logger.js`. Đã lưu nguyên thư mục dependency trước sửa, dựng lại các file đọc được và thay đúng file lỗi bằng bản cùng phiên bản Winston 3.18.3 đang hoạt động. Kiểm tra cold-load logger đạt; không tạo thay đổi nội dung Git cho thư mục dependency này. Các service đã khởi động và kiểm tra lại thành công.

## Giới hạn còn lại

- Toàn frontend còn 110 lỗi lint và 25 cảnh báo; không có lỗi parser/fatal trong lượt kiểm tra cuối. Chưa tuyên bố toàn kho mã sạch lint.
- Tra cứu toàn bộ hơn 5.000 cảnh báo khoảng 37–52 giây, khoảng 15 MB; tổng hợp toàn kỳ khoảng 34–37 giây trên máy kiểm tra. Chưa chứng nhận tải đồng thời lớn.
- Audit production dependency ở client và GIS service sau cập nhật: 0 cảnh báo. Đây không phải kiểm toán mọi service hoặc dependency phát triển; vẫn còn cảnh báo peer/dev và bundle lớn.
- Ảnh trước/sau được hiểu là ảnh kỳ đầu/ảnh cảnh báo. Đã có luồng lưu/tra cứu metadata; vẫn cần URL/đầu ra thực tế từ công cụ GEE để nối và nghiệm thu nguồn ảnh khách hàng. Không sinh ảnh giả hoặc tự suy ngày thu nhận từ kỳ xử lý.
- Link GEE/Drive thực tế, từ điển nghiệp vụ chính thức và mẫu ký duyệt vẫn cần xác nhận. Không coi test fixture là nghiệm thu các nguồn này.

## Bản sao lưu và minh chứng

Thư mục riêng ngoài web/repository:

`C:\Users\Administrator\AppData\Local\Temp\2\opencode\vfis-backup-20261016-232822`

Có bản sao lưu ban đầu và thư mục `release` chứa bản dump ba DB khi đã dừng nguồn ghi, cấu hình, manifest/hash, file cũ, kết quả API/browser và kiểm tra PNG/PDF. Các bản sao lưu ban đầu đã thực sự được phục hồi vào database staging độc lập. Không đưa thư mục này lên Git hoặc chia sẻ công khai.

Hướng dẫn kỹ thuật và quy tắc nguồn ảnh: `docs/VFIS-windows-upgrade.md`. Nếu phải quay lui sau migration, cần xét cả database và code, không chỉ chuyển frontend cũ.
