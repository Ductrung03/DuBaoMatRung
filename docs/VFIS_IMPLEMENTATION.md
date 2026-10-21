# Bàn giao tinh chỉnh VFIS T10/2026

## 1. Vị trí và phạm vi

Mã nguồn được chỉnh trong bản clone nhánh `main` tại `D:\phule\phanmemmatrung\DuBaoMatRung-main`, nền commit `f48a8ddd7300a1645372ac80e248b36a0665a427`.

Không merge/cherry-pick nhánh VFIS cũ. Bản sửa được bàn giao trên nhánh kiểm thử `review/vfis-t10-2026`; chỉ đưa vào `main` sau khi kiểm tra server và có yêu cầu phê duyệt riêng.

Đặc tả đầy đủ, gồm mô tả độc lập 28 hình, có trong repository: [DAC_TA_TINH_CHINH_GIAO_DIEN_GIAM_SAT_MAT_RUNG_T10_2026.md](./DAC_TA_TINH_CHINH_GIAO_DIEN_GIAM_SAT_MAT_RUNG_T10_2026.md). Không cần file Word để đọc bản đặc tả này; logo FIS đã có trong `client/public/brand/`.

### Lấy bản kiểm thử sang server

Clone vào thư mục mới, không checkout hoặc ghi đè thư mục ứng dụng production đang chạy:

```bash
git clone --branch review/vfis-t10-2026 --single-branch https://github.com/Ductrung03/DuBaoMatRung.git DuBaoMatRung-vfis-test
cd DuBaoMatRung-vfis-test
git branch --show-current
git log -1 --oneline
npm run test:vfis
```

Sau đó cài dependency trên server theo môi trường triển khai hiện có và chạy `npm run build:frontend`. Không dùng node_modules hoặc junction của máy Windows. Nếu dùng npm để cài dependency, có thể cần `--legacy-peer-deps` do các peer dependency cũ; không tự nâng phiên bản/audit fix trong lúc đối chiếu.

Đọc mục 4–5 trước khi nghiệm thu. Thiết lập cấu hình môi trường riêng cho bản kiểm thử, không commit `.env`/mật khẩu và không tự chạy migration, seed, xóa database hoặc thay cổng/volume production. Thay đổi gồm cả frontend, gateway và search-service; chỉ build frontend sẽ chưa áp dụng sửa backend. Cách khởi động dịch vụ phải theo cấu hình thực tế của server, dùng cổng/domain thử riêng.

Push nhánh này không kích hoạt workflow CI/CD hiện tại của repository vì workflow push chỉ áp dụng main/develop. Chưa tạo PR hoặc merge tự động.

## 2. Phần đã triển khai

- Header hai hàng: logo FIS trích trực tiếp từ Word, chữ VFIS, tên hệ thống, tên đơn vị, tên tài khoản và avatar/fallback. Giữ đổi mật khẩu/đăng xuất.
- Năm mục menu theo thứ tự, có icon. Mobile dùng menu ngang cuộn, không mất đường điều hướng.
- `/dashboard/phathienmatrung`: giao diện giám sát xanh đậm theo hình Word, sidebar thống kê/bộ lọc/lớp, bản đồ trên bảng dưới, panel chi tiết ẩn/hiện.
- Hover polygon có tooltip an toàn dạng text; click polygon/chọn mã lô mở đúng panel. Highlight, fit bounds, ResizeObserver cập nhật map khi đổi panel.
- Nền Esri/OSM, lớp WMS hiện trạng và ranh giới xã, lớp GeoJSON cảnh báo chỉ vẽ một lần theo tập dữ liệu đang lọc.
- Hai nội dung theo nhóm tài khoản: bảng quản lý 7 cột tổng hợp xã–đơn vị; bảng người sử dụng 12 cột lá, header tọa độ gộp.
- Thống kê thời gian, top 5 địa bàn theo diện tích; thống kê công việc và trạng thái cho người sử dụng.
- Bộ lọc thời gian, tháng nhanh, xã, đơn vị hoặc thôn/tiểu khu, trạng thái, nguồn gốc/chức năng rừng khi có dữ liệu nguồn. Tìm kiếm và lọc đồng bộ bản đồ/bảng/biểu đồ.
- Bảng phân trang hiển thị 50 dòng, xuất toàn bộ tập kết quả được lọc (không chỉ trang đang xem).
- `/dashboard/baocao`: báo cáo tỉnh tổng hợp theo xã/nguyên nhân, xã chi tiết từng lô; chọn tháng, trạng thái/nguyên nhân, loại diện tích, văn bản/biểu đồ.
- Excel ở giám sát; DOCX/PDF/GeoJSON ở báo cáo; GeoJSON vẫn là các polygon lô được lọc, không giả làm polygon tổng hợp xã.
- Dùng cùng tập kết quả đã chuẩn hóa cho bảng, biểu đồ và xuất; phân biệt null với 0, diện tích cảnh báo với xác minh.
- API search bổ sung metadata whitelist tùy cột có thật, không yêu cầu migration để truy vấn metadata tùy chọn.
- Đường `/api/search` qua gateway yêu cầu đăng nhập; tài khoản hạn chế phải có xã được cấp. Áp dụng thêm tiểu khu/khoảnh khi có header scope từ gateway. Khóa cache đọc/ghi thống nhất và chứa scope/limit.

## 3. Bảo toàn công cụ cũ và phân quyền

- `/dashboard/phathienmatrung?tool=imagery`: giữ màn hình xử lý ảnh GEE, lọc mây, bảng kê và sidebar nhập shapefile.
- `/dashboard/dubaomatrung`: giữ dự báo tự động/tùy chỉnh như trước.
- Hai công cụ có liên kết trong sidebar giám sát nếu có quyền tương ứng. Không xóa code hoặc route cũ.
- Quyền truy cập màn hình giám sát mới vẫn là `detection`; dự báo cũ vẫn là `forecast`; báo cáo vẫn là `reports`.
- Nếu chỉ có quyền forecast mà không detection, menu Giám sát dẫn tới màn hình dự báo cũ thay vì tự nâng quyền detection.
- Trình bày quản lý nhận các role thực tế `Admin`, `LanhDao`, `admin`, `super_admin`, hỗ trợ userRoles cũ và fallback admin giống AuthContext. Việc đổi giao diện không cấp thêm quyền dữ liệu.
- Backend vẫn tin các header danh tính/scope do gateway gắn; không công bố trực tiếp search-service ra Internet.
- Chưa thực hiện kiểm toán an ninh toàn hệ thống hay xử lý mọi endpoint cũ ngoài đường truy vấn đang tích hợp.

## 4. Quy ước tạm dùng cần chủ nghiệp vụ duyệt

1. Kỳ thời gian dùng `end_sau` vì backend hiện tại dùng trường này. Nhãn ghi rõ “kết thúc kỳ ảnh sau”; không gọi đó là ngày thu nhận ảnh.
2. Diện tích cảnh báo: `dtich` m² → ha; diện tích xác minh: `dtichXM`/`verified_area` m² → ha. Không fallback giữa hai loại.
3. Trạng thái: Đã xác minh/Đã xong → hoàn tất; Đang xác minh/Đang xử lý → xử lý; Chưa xác minh/Chưa kiểm tra/Mới → chưa kiểm tra. Khác → chưa xác định.
4. Báo cáo Chưa xác minh gồm chưa kiểm tra + đang xử lý, không tự đưa trạng thái chưa rõ vào nhóm đó.
5. Màu: chưa kiểm tra đỏ, đang xử lý cam, hoàn tất vàng, chưa rõ xám. Đây là ánh xạ triển khai cần duyệt; không coi vàng là đánh giá an toàn hiện trường.
6. Bảng quản lý nhóm theo xã–đơn vị. Xu hướng dựa diện tích cảnh báo, chỉ so sánh khi chọn trọn tháng lịch; tháng trước bằng 0 hiển thị phát sinh mới thay vì phần trăm vô hạn.
7. Tọa độ x/y từ search-service hiện là tâm polygon WGS84, không phải tọa độ kiểm tra hiện trường. UI ghi rõ nguồn này.
8. Chỉ loại trùng cùng gid; không tự hợp nhất vùng chồng lấn khác mã/kỳ ảnh.
9. Top địa bàn hiện theo xã. Xếp hạng chủ rừng/ban quản lý và kỳ ảnh riêng cần nguồn danh mục và quy tắc bổ sung.
10. Đơn vị tổng hợp do người dùng nhập thực tế, không lấy đơn vị ví dụ trong Word làm dữ liệu thật.

## 5. Chưa hoàn tất vì thiếu nguồn dữ liệu/quy tắc

Không được coi các mục dưới đây là đã triển khai đầy đủ chỉ vì UI có chỗ hiển thị:

- Liên kết/giao không gian lô mất rừng với một hoặc nhiều lô hiện trạng. Chưa thêm truy vấn chọn ngẫu nhiên một lô gốc; panel báo chưa có liên kết.
- Nguồn ảnh vệ tinh trước/sau đúng khu vực. Chỉ hiển thị URL thật nếu API có; thiếu thì ghi Chưa có ảnh, không dùng ảnh giả hoặc ảnh nền hiện tại làm ảnh lịch sử.
- Ngày thu nhận ảnh thực, tên người cập nhật/xác minh, ngày xác minh, đơn vị quản lý, thôn, nguồn gốc/chức năng rừng… chỉ hiển thị khi API có dữ liệu. Cột thiếu được báo rõ.
- Metadata tùy chọn được đọc theo tên đã whitelist: `verified_by`, `verified_by_name`, `verified_at`, `updated_at`, `updated_by`, `updated_by_name`, `image_date`, `acquisition_date`, `management_unit`, `village`, `forest_origin`, `forest_function`, `forest_type`, `forest_owner`, `before_image_url`, `after_image_url`.
- Chưa suy ra loại rừng/chủ rừng từ centroid hoặc bảng hành chính. API hành chính cũ không đủ để chứng minh quan hệ lô hiện trạng.
- Tách/bật tắt từng trạng thái WMS hiện trạng chưa làm vì chưa có danh mục/style WMS chính thức. Hiện bật/tắt cả lớp gốc và có thông báo.
- Chưa có thanh kéo ảnh so sánh, in phiếu tuần tra hoặc QR tọa độ mới. Đây là chi tiết hình cần chốt phạm vi; hai nhãn ảnh trước/sau đã có.
- Chưa có kiểm thử end-to-end với PostgreSQL/PostGIS, MapServer, Redis, GEE và tài khoản thật. Kiểm thử browser bên dưới sử dụng fixture, không xác nhận dữ liệu thật.

## 6. Kiểm thử và cách chạy

### Kết quả đã chạy trên máy phát triển

- `npm run test:vfis`: 22/22 bài đạt (15 nghiệp vụ frontend, 7 mock controller backend).
- `npm run build:frontend`: đạt; còn cảnh báo bundle lớn/import XLSX từ code cũ.
- Lint các module monitoring, Header và navigation: không lỗi; ESLint cảnh báo định dạng .eslintignore cũ của dự án.
- Chrome smoke: cả admin/User đạt với dữ liệu fixture; đã thử Excel/DOCX/PDF/GeoJSON, chọn lô, biểu đồ, tổng và mobile, không có pageerror.
- Kiểm tra file xuất: DOCX đọc được XML và bảng; PDF có chữ ký định dạng hợp lệ; GeoJSON parse được và đúng số feature fixture theo role.
- `git diff --check`: không lỗi whitespace.
- Các kết quả trên không thay thế nghiệm thu kết nối database/WMS, số liệu và tài khoản thật.

### Kiểm thử nghiệp vụ/API không cần database

```powershell
npm run test:vfis
```

Bao gồm chuẩn hóa diện tích/null, loại trùng, trạng thái, kết hợp bộ lọc, tháng nhuận, tổng hợp, role; mock controller để kiểm tra scope, limit, cache và trường metadata.

### Build frontend

```powershell
npm run build:frontend
```

### Lint phần mới

```powershell
cd client
node node_modules/eslint/bin/eslint.js src/dashboard/monitoring src/dashboard/layout/Header.jsx src/dashboard/layout/navigation.js
```

### Smoke test browser (tùy chọn)

Cần Playwright và Chrome. Dữ liệu fixture chỉ nằm trong test, không được nạp vào ứng dụng production.

```powershell
# Terminal 1, tại client
npm run dev -- --host 127.0.0.1 --port 5179 --strictPort

# Terminal 2, tại client, sau khi đã có package playwright
node tests/vfis-ui.smoke.mjs
```

Có thể đặt `PLAYWRIGHT_MODULE` thành URL file tới `playwright/index.mjs` nếu cài ngoài dự án; `VFIS_TEST_OUTPUT` là thư mục lưu ảnh/file kiểm thử, `VFIS_TEST_URL` đổi URL server.

Test hai role, số cột, chọn lô/mở panel, tổng báo cáo, biểu đồ, xuất Excel/DOCX/PDF/GeoJSON, chiều rộng mobile và lỗi JavaScript.

### Môi trường phụ thuộc tại máy đã sửa

Repository gốc có theo dõi cả node_modules nhưng thiếu binary Windows/docx và shim chạy Vite. Để không làm biến động hàng chục nghìn file dependency đã theo dõi, đã cài dependency frontend vào:

`C:\Users\hieu1\AppData\Local\Temp\opencode\vfis-build-tools`

`client/node_modules` hiện là junction cục bộ tới thư mục trên, không phải mã nguồn để chuyển sang máy khác. Máy nhận cần cài dependency bình thường theo package.json/lockfile; không copy junction. Không có thay đổi dependency khai báo cho giao diện mới; Playwright chỉ dùng công cụ kiểm thử tùy chọn.

Build có cảnh báo bundle lớn từ ứng dụng và XLSX còn được import tĩnh bởi code cũ. Bộ dependency hiện hữu có cảnh báo lỗ hổng từ npm; chưa tự chạy audit fix hoặc nâng phiên bản ngoài phạm vi vì có thể gây breaking change.

## 7. File chính

- `client/src/dashboard/monitoring/*`: dữ liệu dùng chung, hook API, workspace, map, charts, details, reports, exports, CSS và unit tests.
- `client/src/dashboard/layout/Header.jsx`, `navigation.js`, `MainLayout.jsx`, `Sidebar.jsx`: nhận diện, điều hướng, khung layout.
- `client/src/App.jsx`: route giám sát/công cụ cũ/báo cáo mới.
- `client/public/brand/fis-logo.jpeg`: logo trích từ Word.
- `microservices/services/search-service/src/controllers/search.controller.js`: metadata, scope, cache, limit.
- `microservices/gateway/src/index.js`: bắt buộc xác thực search.
- `microservices/services/search-service/test/vfis-search.test.cjs`: test controller cô lập.
- `client/tests/vfis-ui.smoke.mjs`: kiểm thử trình duyệt với fixture.

## 8. Trước khi chạy chính thức

1. Duyệt các quy ước ở mục 4 và quyết định các hạng mục thiếu ở mục 5.
2. Kiểm tra mapping tên cột/đơn vị thật, nhất là verified_area và ngày xác minh.
3. Kiểm tra ít nhất Admin/LanhDao và tài khoản xã có/không có scope; thử cố đổi xã/tiểu khu/khoảnh trong request.
4. So sánh dữ liệu bảng, biểu đồ, DOCX/PDF/GeoJSON với truy vấn SQL đã biết kết quả.
5. Chạy PostGIS/MapServer thật để xác nhận tọa độ, thứ tự lớp và WMS.
6. Sau khi nghiệm thu mới merge vào main hoặc deploy production theo yêu cầu riêng; nhánh kiểm thử không được tự động coi là bản đã duyệt.
