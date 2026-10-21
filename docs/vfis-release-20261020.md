# VFIS — kế hoạch triển khai và hồ sơ bàn giao 20/10/2026

## Phạm vi
- Giữ bản đồ dùng chung, màu/lớp gốc, quyền địa bàn và toàn bộ số liệu/xuất dữ liệu.
- Thanh số kết quả/xuất/lọc xác minh ở trên bảng, không cuộn theo dòng; bỏ số tổng lặp dưới bảng.
- Giám sát: Tự động → Tùy biến → Ranh giới → Lớp bản đồ.
- Tra cứu: Phân tích → Ảnh vệ tinh → Xác minh → Ranh giới → Lớp bản đồ. Trên điện thoại giữ ba tab chức năng theo thứ tự tương ứng.
- Bỏ nền trắng bên ngoài logo header bằng tài sản PNG trong suốt, giữ JPEG gốc.
- Ảnh đối chứng: cùng vị trí/phạm vi/tỷ lệ; ảnh trước trong start_dau–end_dau, ảnh sau trong start_sau–end_sau. Ghi ngày chụp/mã cảnh/nguồn thật. Không dùng ngày cảnh báo làm ngày chụp, không lấy ảnh ngoài kỳ.

## Trình tự và điều kiện nghiệm thu
1. Sao lưu nguồn/frontend đang phục vụ; không sửa dữ liệu, quyền, dependencies hoặc merge main.
2. Kiểm tra dịch vụ ảnh lịch sử bằng cảnh thật. Truy vấn chỉ khi mở hồ sơ đã được API cho phép; hủy yêu cầu khi chuyển lô. Báo rõ thiếu kỳ/ngày/tọa độ/ảnh hoặc lỗi nguồn mạng.
3. Tạo logo trong suốt; tích hợp ảnh trước/sau. Giữ nguyên ảnh nền chính và trạng thái bản đồ.
4. Chạy lint phạm vi sửa, kiểm thử đơn vị, build, browser desktop/mobile, lọc/số lượng/xuất đủ dữ liệu, ảnh thật và lỗi giả lập.
5. Chỉ xuất bản sau kiểm thử đạt; tài sản trước, index cuối; giữ tài sản cũ. Kiểm tra bản live và hash trên cổng 80/3000.
6. Ghi kết quả thực tế và giới hạn trong hồ sơ này. Không tuyên bố đã sửa hết lỗi ngoài phạm vi kiểm chứng.

## Kết quả triển khai
- Hoàn tất các thay đổi giao diện nêu trong phạm vi, bao gồm logo trong suốt và ảnh đối chứng lịch sử. Đã tích hợp vào phần mềm đang phục vụ tại cổng 80 và 3000, kiểm tra lại sau xuất bản.
- Không thay đổi số liệu nghiệp vụ, hình học, phân quyền, tài khoản, lớp rừng gốc hoặc cấu hình báo cáo. Không seed/migrate/nâng dependency/merge main; không commit hoặc push.
- Ảnh được truy vấn trực tiếp từ ImageServer lịch sử công khai: ưu tiên Sentinel-2 (10 m), dùng Landsat (30 m) khi tìm được cặp đầy đủ cùng nguồn. Không ghép hai nguồn khác độ phân giải làm một cặp.
- Cả hai ảnh khóa mã raster thật, cùng EPSG:3857, khung vị trí và ảnh 640×640. 640 pixel là kích thước hiển thị, không phải độ phân giải gốc; không suy diễn mức chi tiết từ kích thước ảnh.
- Khoảng ngày dùng lịch Việt Nam UTC+7 và bao gồm toàn bộ ngày cuối. Trong từng kỳ chọn cảnh có tỷ lệ mây toàn cảnh thấp nhất; nếu bằng nhau chọn ngày mới hơn. Chỉ dùng footprint phủ cả khung ảnh. Không tự tạo kết luận biến động.
- Chỉ tìm ảnh khi hồ sơ lô đã qua kiểm tra quyền ở API và mã hồ sơ trùng lô đang chọn. Không gửi JWT/cookie nghiệp vụ sang nguồn ảnh. Hủy truy vấn khi đóng/chuyển hồ sơ; giới hạn chờ truy vấn 45 giây, cặp ảnh 30 giây; có nút thử lại.
- Phát hiện và xử lý lỗi CSP ở gateway cổng 3000: bổ sung duy nhất https://sentinel.arcgis.com và https://landsat2.arcgis.com vào connect-src. Không mở kết nối tùy ý. Chỉ khởi động lại gateway để nạp chính sách, không khởi động lại các dịch vụ nghiệp vụ.

## Nghiệm thu
- 46/46 kiểm thử frontend đạt: dữ liệu/phân quyền cache/bản đồ dùng chung, kỳ ảnh, lịch UTC+7, vùng phủ, cảnh thật trong kỳ, khóa raster, nguồn dự phòng, dữ liệu thiếu, lỗi nguồn/hủy yêu cầu và CSP production.
- 19/19 kiểm thử backend search/profile/revision/phạm vi quản lý đạt. Không sửa backend nghiệp vụ.
- Lint các tệp frontend liên quan không có lỗi/cảnh báo quy tắc; kiểm tra cú pháp gateway đạt. Công cụ ESLint vẫn thông báo cấu hình .eslintignore cũ; không nâng dependency trong đợt này.
- Build production đạt. Còn cảnh báo tối ưu bundle lớn, chunk vendor rỗng và XLSX dùng import hỗn hợp; đây không phải lỗi build, chưa thực hiện tái cấu trúc ngoài phạm vi.
- Browser admin/User: hai trang, màn hình 1600×1000, 1100×760, 390×844; thứ tự panel đúng, không còn tổng lặp dưới bảng, thanh trên bảng không dịch chuyển khi cuộn hai trục, tiêu đề/cột thẳng hàng, không tràn ngang trang.
- Bộ lọc cho đúng các trường hợp có dữ liệu/0 bản ghi. Excel/GeoJSON xuất đủ dữ liệu lọc thay vì chỉ dòng đang hiển thị. Smoke báo cáo/biểu đồ/Excel/DOCX/PDF/GeoJSON cho admin/User đạt trên candidate và live.
- Tài khoản thật cấp tỉnh và vùng: chỉ một lần tải bộ cảnh báo khi chuyển Tra cứu/Giám sát; giữ nguyên đối tượng bản đồ. APIs nghiệp vụ và ảnh đối chứng là thật; chỉ ảnh nền chính/WMS được thay bằng ảnh thử trong bài test bố cục để tách ảnh hưởng mạng.
- Lô 1: kỳ đầu 01–15/01/2026 chọn ảnh chụp 12/01/2026, raster 25592650, cảnh 20260112T035225_48QUK_1; kỳ cuối 15–30/01/2026 chọn ảnh chụp 20/01/2026, raster 25127904, cảnh 20260120T035204_48QUK_0. Hai PNG thật 640×640 tải thành công; thanh kéo và phím mũi tên hoạt động trên trình duyệt. Logo có alpha 0 ở góc và giữ phần biểu tượng bên trong.
- Lô vùng 1461: kỳ đầu tháng 4/2025 không có cảnh trả về từ cả hai nguồn; kỳ cuối tháng 5/2026 tìm được ảnh 27/05/2026. UI hiển thị ảnh cuối và báo thiếu ảnh đầu, không dựng thanh so sánh giả.
- Giả lập nguồn trả rỗng, từ chối truy vấn, đóng hồ sơ khi đang chờ: thông báo đúng, không còn ảnh/slider cũ, không có lỗi JavaScript chưa xử lý.
- Đã kiểm tra hash tài sản JS/CSS/logo và index ở cả địa chỉ local/public cổng 80/3000; giữ nguyên các nguồn frontend không liên quan và JPEG logo gốc. Kiểm tra live sau sửa CSP đạt.

## Giới hạn còn lại và hướng xử lý
- Không đảm bảo mọi lô có đủ hai ảnh: nguồn công khai có giới hạn lưu trữ, vùng phủ, mây và khả năng truy cập mạng. Không tìm thấy cảnh không có nghĩa là cảnh báo sai hoặc không có biến động.
- Ví dụ tháng 4/2025 của lô 1461 vẫn thiếu ảnh đầu. Muốn bảo đảm đối chứng các kỳ cũ cần nguồn lưu trữ dài hạn/GEE/Drive do đơn vị cung cấp cùng quyền truy cập hoặc một dịch vụ ảnh có archive phù hợp. Bản phát hành không tự tạo ngày chụp/ảnh thay thế.
- Ảnh là dữ liệu tham khảo trực quan; độ mây toàn cảnh không khẳng định lô không có mây. Phóng ảnh không tăng độ phân giải cảm biến. Không áp dụng quy tắc phân loại mới hoặc tự xác minh cảnh báo.
- Nền Esri hiện tại trên bản đồ chính vẫn là nền không chọn ngày. Phần đối chứng dùng dịch vụ ảnh lịch sử riêng, không chụp hai lần nền hiện tại rồi gán hai kỳ.
- Chỉ xác nhận các bài kiểm thử và tài khoản/mẫu nêu trên; không tuyên bố toàn bộ phần mềm không còn mọi lỗi hoặc mọi mạng khách đều truy cập được ảnh.

## Vận hành và khôi phục
- Người dùng nhấn Ctrl+F5 để nạp bản mới; mở hồ sơ lô, xem mục 3 và ngày chụp/mã cảnh từng ảnh. Chỉ dùng thanh kéo khi đủ hai ảnh cùng kích thước.
- Sao lưu trước thay đổi: C:/Users/Administrator/AppData/Local/Temp/2/opencode/vfis-final-integration-20261020.
- Thư mục sao lưu có manifest.json, initial-manifest.json, gateway-policy-manifest.json, nguồn/index/tài sản cũ, kết quả JSON candidate/live và ảnh minh chứng. Các bản sao lưu đợt toolbar/thứ tự sidebar trước đó vẫn được giữ riêng.
- Khôi phục giao diện: phục hồi những tệp đã tồn tại trước thay đổi theo manifest và index cũ; index xuất bản cuối. Giữ tài sản không sử dụng để tránh mất rollback của phiên đang mở. Không reset/checkout cả repository.
- Nếu hoàn nguyên CSP: phục hồi riêng microservices/gateway/src/index.js đã sao lưu rồi restart gateway; chỉ làm cùng lúc với hoàn nguyên tính năng ảnh để tránh tự chặn truy vấn đang dùng. Không cần rollback cơ sở dữ liệu.
- Máy chủ frontend candidate chỉ phục vụ đọc và được dừng sau nghiệm thu. Dịch vụ clip-worker vẫn dừng có chủ đích; không bật trong đợt này.

## Bộ hồ sơ bàn giao
- Kế hoạch, phạm vi, kiểm thử, giới hạn và rollback: docs/vfis-release-20261020.md.
- Bản in đóng quyển: docs/VFIS-BanGiao-20261020.pdf.
- Script kiểm chứng và bằng chứng kỹ thuật nằm trong thư mục sao lưu nêu trên; không bao gồm mật khẩu/JWT trong hồ sơ.
