# Kết quả kiểm tra server 19/10/2026

## Trạng thái: CHƯA NGHIỆM THU / CHƯA TRIỂN KHAI PRODUCTION

Nhánh `review/vfis-t10-2026`, commit gốc `371f39f1bdc7f67305f6012561186794f2e968db`.
Các sửa đổi tích hợp nằm trong working tree clone riêng `C:\DuBaoMatRung-vfis-test`;
không commit, push, merge vào main hoặc ghi đè phần mềm đang phục vụ.

## Bảo toàn

- Đã sao lưu nguồn/frontend liên quan và dump mới `auth_db`, `admin_db`, `gis_db`.
- Đã phục hồi thành ba database `vfis_t10_20261019_auth`, `vfis_t10_20261019_admin`, `vfis_t10_20261019_gis`.
- Fixture tài khoản/ranh giới/cảnh báo chỉ được thêm vào các database kiểm thử.
- Đối chiếu sau kiểm tra: 122 file production khớp SHA-256 với bản sao lưu;
  checksum toàn bộ dòng của User, Role, Permission, UserRole, RolePermission và
  son_la_mat_rung khớp snapshot trước kiểm tra (loại riêng fixture ở bản sao).
- Production giữ nguyên 85 tài khoản, 5.297 cảnh báo, không chạy migration/seed.
- Trạng thái hiện có được đọc đúng, không sửa database: 5.010 Mới phát hiện,
  1 Đang xác minh, 286 Đã xác minh.

## Điều chỉnh tại clone kiểm thử

- Nhận diện trạng thái production Mới phát hiện, giữ nguyên giá trị gốc.
- Giữ nhãn Ảnh kỳ đầu / Ảnh kỳ cuối và ngày thu nhận độc lập, không suy ra từ end_sau.
- Search xác minh JWT, đọc quyền/phạm vi hiện tại từ auth DB, không tin header hoặc quyền cũ trong JWT.
- Search chỉ lắng nghe loopback mặc định; gateway hỗ trợ BIND_HOST cho thử nghiệm riêng.
- Áp phạm vi lên tìm kiếm, chi tiết, lô lân cận và lớp vector phục vụ tài khoản hạn chế.
- Chính sách bảo thủ ở bản thử: polygon phải nằm hoàn toàn trong địa bàn được cấp;
  polygon vượt biên không được trả về. Cần xác nhận nghiệp vụ trước nghiệm thu.
- Cache có giới hạn dung lượng/thời gian, khóa gồm phạm vi và phiên bản dữ liệu cảnh báo.
- Giới hạn/ngày/bbox được kiểm tra; API hủy request không ghi như lỗi thông thường.
- Metadata optional theo whitelist; bổ sung tên người xác minh từ auth DB khi có ID.
- Không chọn tùy ý một xã/tiểu khu/khoảnh khi tra cứu hành chính trả về nhiều giá trị khác nhau.
- Chặn cuộn bản đồ vòng quanh thế giới; lớp vector có thông báo khi chạm giới hạn khung nhìn.
- MapServer: xử lý CGI dạng Buffer để không hỏng PNG và mặc định dùng mapfile Windows đúng nền tảng.
- Header lấy đơn vị thực tế từ tài khoản, không gán mọi người vào cùng đơn vị.

## Đã kiểm tra đạt trong phạm vi nêu dưới

- `npm run test:vfis`: 24/24 (bổ sung 2 regression tests).
- `npm run build:frontend`: đạt; còn cảnh báo bundle lớn/dynamic import.
- ESLint phạm vi monitoring, Header, navigation: không lỗi/cảnh báo code;
  công cụ vẫn cảnh báo cấu hình `.eslintignore` cũ.
- `git diff --check`: đạt.
- Fixture browser smoke: quản lý/người dùng, chọn lô, biểu đồ, tải Excel/DOCX/PDF/GeoJSON,
  mobile; không page error. Đây là fixture, không phải xác nhận nguồn ảnh thật.
- PostgreSQL thực trên bản sao: trả đủ 5.297 bản ghi thật, không trùng gid;
  tổng diện tích tính bằng SQL và API khớp. Ba cảnh báo fixture được đếm riêng.
- Native gateway :13300 -> native search-service :13306 -> bản sao PostgreSQL:
  kiểm tra header giả, tài khoản thiếu quyền/phạm vi, JWT có quyền cũ, xã yêu cầu khác
  xã được cấp, tiểu khu/khoảnh, polygon vượt biên, chi tiết/lân cận, lớp rừng,
  diện tích xác minh bằng 0, input lỗi đều đạt.
- Native gateway/browser: admin tải đủ 5.300 bản ghi (5.297 thật + 3 fixture) trong GeoJSON;
  Excel quản lý có 27 nhóm, không nhầm số nhóm với số lô. Tài khoản fixture hạn chế
  chỉ có 1 lô ở cả API/Excel/GeoJSON. DOCX/PDF/GeoJSON của báo cáo fixture tải được;
  PDF có signature đúng. Mobile chụp được; không page error hoặc HTTP API >=400 bất ngờ.
- Một tài khoản hạn chế hiện hữu vẫn bị chặn màn hình detection theo quyền thực tế;
  KHÔNG ghi nhận trường hợp này là đã dùng được màn hình giám sát mới.
- WMS ranh giới xã/hiện trạng rừng: native MapServer :13308 trả PNG đúng signature.
  Mapfile hiện hành đọc dữ liệu production, chỉ đọc; kiểm tra này KHÔNG thay thế
  nghiệm thu MapServer trỏ hoàn toàn tới database bản sao.
- Auth/GIS ở phép thử gateway dùng router thật trong adapter :13190 trên bản sao;
  không phải nghiệm thu đầy đủ process/deployment riêng của mọi microservice.

## Chặn triển khai / cần quyết định và dữ liệu

1. Trong 85 tài khoản hoạt động, 7 tài khoản không có xã hoặc quyền scope toàn tỉnh
   (các vai trò Chi cục kiểm lâm/Công ty Fis); 78 tài khoản không có quyền detection.
   Không tự mở rộng quyền. Cần ma trận vai trò/phạm vi được phê duyệt trước tích hợp.
   Một tài khoản chưa có reports.view; cần giữ nguyên hoặc phê duyệt thay đổi riêng.
2. Chưa có nguồn ảnh lịch sử thật/GEE/Drive được nghiệm thu, quan hệ lô rừng,
   danh mục phân loại rừng chính thức và mẫu báo cáo ký duyệt.
3. Truy vấn đầy đủ 5.300 bản ghi khoảng 13 MB, lần nguội native gateway ~18 giây,
   các lần adapter trước đó 17–26 giây. Chưa đạt cam kết thao tác nhanh trên mạng thật.
4. Chưa nghiệm thu đầy đủ chức năng cũ: tạo/sửa tài khoản và role, đổi mật khẩu,
   nhập shapefile/GEE, xác minh có ghi dữ liệu, dự báo tự động/tùy chỉnh,
   MapServer/Redis hoàn toàn cô lập, nguồn basemap/GEE ngoài, pan/zoom nhanh và opacity.
5. Dependency audit báo các lỗ hổng tồn tại. Không chạy audit fix/nâng major trong
   đợt đánh giá; cần xử lý riêng trước chấp nhận rủi ro triển khai.
6. Khi được phép triển khai, chỉ đồng bộ các thay đổi đã đối chiếu với local work
   production, không chép cả clone và không thay database bằng bản thử có fixture.
7. Log tích hợp cho thấy GeoDataProvider vẫn gọi API GIS cũ
   `/api/mat-rung/geojson/recent`; tài khoản hạn chế nhận 1.000 lô trong khi search mới
   chỉ trả dữ liệu đúng phạm vi. Đọc controller cũ xác nhận không áp scope ở handler
   này. Bảo vệ search mới CHƯA đồng nghĩa bảo vệ toàn bộ API cũ. Cần xử lý và kiểm tra
   hồi quy GIS trước triển khai, không đánh dấu phân quyền toàn hệ thống đã đạt.
8. WMS hiện trạng rừng trên khung nhìn lớn có request 26–46 giây theo log native
   MapServer; PNG hợp lệ không đồng nghĩa hiệu năng đạt. Chưa nghiệm thu tốc độ bản đồ.

## Bằng chứng riêng trên server

`C:\Users\Administrator\AppData\Local\Temp\2\opencode\vfis-t10-integration-20261019`

Gồm dump, preflight, production-hashes.json, preservation-result.json,
api-check.json, native-api-check.json, fixture-browser và real-browser/result.json.
Không đưa dump, credential hoặc PM2 environment vào repository.
