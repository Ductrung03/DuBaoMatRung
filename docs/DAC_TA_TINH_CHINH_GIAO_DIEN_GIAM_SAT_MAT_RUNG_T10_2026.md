# ĐẶC TẢ TINH CHỈNH GIAO DIỆN HỆ THỐNG GIÁM SÁT MẤT RỪNG

## Tài liệu bàn giao độc lập cho agent triển khai

**Nguồn:** `Báo cáo tinh chỉnh giao diện Hệ thống giám sát mất rừng T10-2026_Anh Quang.docx`.

**Đường dẫn nguồn trên máy đã phân tích:** `C:\Users\hieu1\Downloads\Báo cáo tinh chỉnh giao diện Hệ thống giám sát mất rừng T10-2026_Anh Quang.docx`.

**Mục đích:** Người hoặc agent nhận file này có thể hiểu phạm vi chỉnh sửa, bố cục, nội dung của từng hình và các điểm nghiệp vụ cần xác nhận mà không cần có file Word.

**Trạng thái:** Đây là đặc tả bàn giao, không phải biên bản xác nhận đã triển khai. Không có thay đổi mã nguồn ứng dụng đi kèm tài liệu này.

### Giới hạn và mức độ tin cậy

- Nội dung văn bản, bảng và cấu trúc tài liệu được đọc trực tiếp từ DOCX.
- Chữ trong hình và vị trí chữ được nhận dạng tự động; có thể sai ở chữ nhỏ, tên riêng hoặc nhãn bị cắt.
- Chưa xác minh trực quan đầy đủ từng chi tiết đồ họa. Không coi mô tả này là bản sao chính xác từng pixel.
- Không có thông số được xác minh về mã màu, font, kích thước CSS hoặc đường nét logo.
- Logo FIS chính thức là asset cần được chuyển riêng nếu máy triển khai chưa có. Không thể tái tạo trung thực logo chỉ từ tên gọi.
- Các kích thước ảnh trong phần mô tả là kích thước ảnh nhúng, không phải kích thước CSS bắt buộc.

---

# 1. QUY ƯỚC VÀ NGUYÊN TẮC

## 1.1. Nhãn phân loại

- **[GỐC]:** Yêu cầu được nêu trực tiếp trong nội dung Word.
- **[HÌNH]:** Chi tiết nhận biết được trong hình minh họa; không mặc nhiên là nghiệp vụ bắt buộc đã chốt.
- **[ĐỀ XUẤT]:** Hướng triển khai hợp lý, cần phân biệt với yêu cầu khách hàng.
- **[CẦN XÁC NHẬN]:** Nội dung còn thiếu, mâu thuẫn hoặc có nhiều cách hiểu.

## 1.2. Thứ tự ưu tiên

1. Yêu cầu được viết rõ trong mô tả văn bản.
2. Bảng dữ liệu trong Word để xác định cột và cấp độ dữ liệu.
3. Hình minh họa để tổ chức bố cục và thông tin.
4. Không âm thầm chọn một cách hiểu khi hình và văn bản khác nhau.
5. Không lấy dữ liệu ví dụ trong hình làm dữ liệu sản xuất.
6. Không tự thay thuật toán phát hiện mất rừng, mở rộng quyền hoặc xóa chức năng cũ ngoài phạm vi.

## 1.3. Phân loại hình

- **Hiện trạng:** Hình 01, 14, 28. Dùng hiểu hệ thống cũ, không dựng lại nguyên trạng.
- **Mục tiêu/bố cục:** Hình 02, 15, 16, 22.
- **Asset logo:** Hình 03.
- **Cắt chi tiết:** Các hình còn lại. Không phải các màn hình độc lập mới.

---

# 2. TỔNG QUAN PHẠM VI

Có ba nhóm công việc:

| Nhóm | Phạm vi |
|---|---|
| A | Header, nhận diện thương hiệu và menu chính |
| B | Giao diện giám sát theo hai nhóm người dùng |
| C | Logic truy vấn, tổng hợp, trình bày báo cáo và thống kê |

Đây không chỉ là thay nhãn hoặc đổi CSS. Một số nội dung cần dữ liệu, truy vấn backend, tổng hợp thống kê và liên kết không gian.

## 2.1. Hai nhóm giao diện

### Lãnh đạo/Người quản lý

- Theo dõi tình hình chung và diễn biến theo thời gian.
- So sánh địa bàn, đơn vị quản lý, chủ rừng.
- Theo dõi số lô, diện tích và tiến độ xác minh.
- Bảng dưới bản đồ là bảng tổng hợp địa bàn/đơn vị.

### Người sử dụng

- Theo dõi khối lượng công việc kiểm tra, xác minh.
- Lọc theo thôn/bản/tiểu khu.
- Xem từng lô, tọa độ và kết quả xác minh.
- Bảng dưới bản đồ là bảng chi tiết từng lô.

**[CẦN XÁC NHẬN]** Role thực tế nào tương ứng hai nhóm trên? Không mặc nhiên coi tài khoản có tên Admin là Lãnh đạo.

---

# 3. ĐẶC TẢ CHỨC NĂNG VÀ GIAO DIỆN

## 3.1. HEAD-01 — Logo và nhận diện

**[GỐC]** Thay logo cành lá bằng logo FIS được cung cấp trong tài liệu.

Các lớp thông tin phải tách biệt:

| Thành phần | Nội dung | Ý nghĩa |
|---|---|---|
| Logo | Logo FIS | Nhận diện thương hiệu |
| Nền tảng | `VFIS` | Tên nền tảng |
| Hệ thống | `HỆ THỐNG GIÁM SÁT MẤT RỪNG` | Tên phần mềm |
| Đơn vị | `CHI CỤC KIỂM LÂM TỈNH SƠN LA` | Khách hàng/đơn vị sử dụng |

Yêu cầu triển khai:

- Không dùng icon cây thay cho logo FIS.
- Không đổi chữ nền tảng VFIS thành FIS.
- Không ghép lại thành một tiêu đề duy nhất để thay thế bốn thành phần.
- Logo giữ tỷ lệ, không kéo méo hoặc cắt nội dung.
- Không tự vẽ logo từ phỏng đoán. Nếu thiếu asset, báo thiếu; placeholder không được coi là hoàn thành.

**[CẦN XÁC NHẬN]** Tên đơn vị lấy từ cấu hình hay cố định cho bản Sơn La?

## 3.2. HEAD-02 — Tài khoản

**[GỐC]** Có tên tài khoản được cấp và ảnh đại diện. Admin trong hình chỉ là ví dụ.

- Hiển thị tài khoản đang đăng nhập, không hard-code Admin.
- Có ảnh đại diện nếu có dữ liệu.
- [ĐỀ XUẤT] Có fallback khi chưa có avatar; tên dài không phá bố cục.
- Không tự bổ sung chức năng sửa hồ sơ/tải avatar thành phạm vi bắt buộc.
- [CẦN XÁC NHẬN] Hiển thị username hay tên hiển thị/họ tên?

## 3.3. NAV-01 — Menu chính

**[GỐC]** Thứ tự sau tinh chỉnh:

| Vị trí | Tên | Icon trước chữ |
|---:|---|---|
| 1 | Giám sát mất rừng | Cây rừng |
| 2 | Tra cứu dữ liệu | Kính lúp |
| 3 | Báo cáo & thống kê | Biểu đồ |
| 4 | Quản lý người dùng | Hình người |
| 5 | Quản lý phân quyền | Bảo mật |

- Chuyển `Xử lý ảnh viễn thám` lên đầu và đổi thành `Giám sát mất rừng`.
- Đổi `Báo cáo` thành `Báo cáo & thống kê`.
- Các mục còn lại giữ tên và chức năng hiện có nếu không có yêu cầu khác.

**Cảnh báo:** Hiện trạng đã có cả Giám sát mất rừng và Xử lý ảnh viễn thám. Phải khảo sát hai route/chức năng trước khi đổi tên. Không tạo hai mục trùng tên hoặc xóa chức năng để ép menu còn năm mục.

**[CẦN XÁC NHẬN]** Hai mục hợp nhất thế nào? Chức năng xử lý ảnh và chức năng giám sát cũ nằm ở đâu sau điều chỉnh?

## 3.4. LAYOUT-01 — Khung giao diện

**[GỐC]** Ba vùng cùng màn hình:

1. Panel trái cố định: thống kê, bộ lọc nhanh, chú giải/lớp.
2. Trung tâm: bản đồ phía trên, bảng thông tin phía dưới.
3. Panel phải ẩn/hiện: chi tiết lô mất rừng, lô hiện trạng và ảnh trước/sau.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Logo FIS | VFIS | Tên hệ thống                Đơn vị | Tài khoản | Avatar  │
├───────────────────────────────────────────────────────────────────────────┤
│ Menu chính                                                               │
├─────────────────┬────────────────────────────────┬────────────────────────┤
│ PANEL TRÁI      │ BẢN ĐỒ                         │ PANEL PHẢI             │
│ Thống kê        │                                │ Thông tin lô mất rừng  │
│ Bộ lọc          │                                │ Thông tin lô hiện trạng│
│ Chú giải/lớp    ├────────────────────────────────┤ Ảnh trước/sau          │
│                 │ BẢNG THÔNG TIN                 │                        │
└─────────────────┴────────────────────────────────┴────────────────────────┘
```

- Sơ đồ có tỷ lệ trung tâm khoảng 50–60%; chưa có quy tắc chính xác khi panel phải đóng/mở.
- “Cố định” không đủ để bắt buộc dùng CSS `position: fixed`.
- [ĐỀ XUẤT] Vùng dài cuộn độc lập, bảng nhiều cột cuộn ngang, cập nhật kích thước bản đồ khi panel thay đổi.
- Chưa có breakpoint hoặc yêu cầu mobile định lượng.

## 3.5. MGR-01 — Thống kê lãnh đạo

**[GỐC]** Hai góc nhìn:

1. Cột/đường thể hiện diễn biến mất rừng theo tháng, năm hoặc kỳ giải đoán ảnh.
2. Xếp hạng địa phương, ban quản lý hoặc chủ rừng có diện tích cảnh báo cao nhất theo kỳ.

- Có nhãn chỉ tiêu và đơn vị.
- Không hard-code dữ liệu hoặc thứ hạng.
- [CẦN XÁC NHẬN] Biểu đồ thời gian dùng diện tích hay số cảnh báo? Ngày nào xác định kỳ? Top bao nhiêu đối tượng? Có chuyển nhóm địa phương/ban quản lý/chủ rừng không?

## 3.6. MGR-02 — Bộ lọc lãnh đạo

**[GỐC]** Có:

- Từ ngày–Đến ngày.
- Cấp hành chính hoặc đơn vị quản lý trực tiếp.
- Trạng thái xác minh hiện trường.
- Loại rừng: tự nhiên, trồng, phòng hộ, đặc dụng.

**Lưu ý:** Tự nhiên/trồng là phân loại theo nguồn gốc, phòng hộ/đặc dụng là chiều phân loại khác. Không gộp thành enum loại trừ nhau nếu dữ liệu thực tế tách hai trường.

**[ĐỀ XUẤT]** Bộ lọc đồng bộ bản đồ, bảng, biểu đồ; có xóa lọc; kiểm tra khoảng ngày; có trạng thái rỗng/lỗi.

## 3.7. MAP-01 — Lớp bản đồ dùng chung

**[GỐC]** Có:

- Bản đồ nền.
- Vệ tinh.
- Ranh giới xã.
- Hiện trạng rừng, xổ theo trạng thái.
- Mất rừng.

- Phân biệt lựa chọn nền với lớp phủ.
- Polygon mất rừng nằm trên hiện trạng, ranh giới xã và nền.
- Màu đỏ/cam/vàng tùy trạng thái; chưa chốt ánh xạ từng màu.
- Chú giải phải khớp ký hiệu đang dùng.
- [ĐỀ XUẤT] Bật/tắt lớp phủ, thu gọn nhóm lớp; đổi nền không làm mất lớp cảnh báo.
- [CẦN XÁC NHẬN] Nguồn bản đồ/vệ tinh, bảng mã màu, lớp mặc định bật.

## 3.8. MAP-02 — Tương tác polygon

**[GỐC]** Hover hiện thông tin nhỏ gọn; click mở panel phải cho polygon được chọn.

**[ĐỀ XUẤT]** Tooltip gồm mã lô, xã, diện tích, trạng thái; highlight đối tượng chọn; tránh hiển thị nhầm kết quả truy vấn cũ khi chọn nhanh nhiều lô.

Không dùng panel tĩnh giống nhau cho mọi polygon.

## 3.9. MGR-03 — Bảng lãnh đạo

**[GỐC]** Bảy cột theo thứ tự:

| STT | Xã | Đơn vị quản lý | Xu hướng (so với tháng trước) | Số lô | Diện tích | Tình trạng |
|---:|---|---|---|---:|---|---|
| 1 | A | Hạt kiểm lâm A | Tăng 45% | 10 | 20 ha | Đã xác minh 10/10 |
| 2 | B | Hạt kiểm lâm B | Giảm 10% | 5 | 8 ha | Đang xác minh 2/5 |

Hai dòng chỉ là ví dụ. Mỗi dòng là tổng hợp địa bàn/đơn vị, không phải một lô.

**[CẦN XÁC NHẬN]** Nhóm theo xã hay xã–đơn vị? Xu hướng tính diện tích hay số lô? Diện tích cảnh báo hay xác minh? 2/5 nghĩa là đã xác minh hay đang xác minh? Lọc khoảng ngày tùy ý thì so tháng trước thế nào?

**[ĐỀ XUẤT]** Nếu tính phần trăm: `(kỳ này - kỳ trước) / kỳ trước × 100%`, xử lý riêng kỳ trước bằng 0. Chưa coi công thức này là nghiệp vụ đã chốt.

## 3.10. DETAIL-01 — Thông tin lô mất rừng

**[GỐC]** Panel phải hiển thị:

- Mã lô, xã, tiểu khu, khoảnh.
- Diện tích.
- Ngày thu nhận ảnh: ngày vệ tinh chụp được biến động.
- Nguyên nhân.
- Ngày cập nhật.
- Người cập nhật.
- Hai ảnh: Trước khi mất / Sau khi mất.

Phân biệt ngày thu nhận ảnh, ngày phát hiện, ngày cập nhật, ngày xác minh; không dùng thay nhau.

## 3.11. DETAIL-02 — Thông tin lô hiện trạng rừng

**[GỐC]** Lô hiện trạng chứa lô mất rừng, là đối tượng khác lô cảnh báo.

| Nội dung | Lãnh đạo | Người sử dụng |
|---|---|---|
| Địa bàn | Xã, Huyện | Thôn, Xã |
| Lâm nghiệp | Tiểu khu, Khoảnh, Lô | Tiểu khu, Khoảnh, Lô |
| Phân loại | Loại đất, loại rừng | Loại đất, loại rừng |
| Quản lý | Chủ quản lý/chủ rừng | Chủ quản lý/chủ rừng |

Ví dụ loại rừng: Rừng tự nhiên núi đất lá rộng thường xanh nghèo. Ví dụ chủ rừng: hộ gia đình hoặc ban quản lý rừng phòng hộ. Không hard-code ví dụ.

**[CẦN XÁC NHẬN]** Có khóa liên kết hay phải giao không gian? Nếu một cảnh báo giao nhiều lô hiện trạng, hiển thị thế nào? Không tự chọn kết quả đầu tiên.

## 3.12. DETAIL-03 — Ảnh trước/sau

**[GỐC]** Khung nhỏ ghép hai ảnh vệ tinh có nhãn Trước khi mất/Sau khi mất.

- Cùng khu vực địa lý để so sánh.
- Không dùng cùng một ảnh cho hai phía hoặc ảnh mẫu thay dữ liệu thật.
- [ĐỀ XUẤT] Có ngày ảnh, thông báo thiếu dữ liệu.
- [HÌNH] Có thanh trượt so sánh ảnh. Văn bản chỉ yêu cầu hai ảnh; thanh trượt chưa phải yêu cầu bắt buộc đã chốt.
- [CẦN XÁC NHẬN] Nguồn ảnh, API, thumbnail/crop theo lô có sẵn chưa?

## 3.13. USR-01 — Thống kê người sử dụng

**[GỐC]** Tổng cảnh báo theo tháng/phiên ảnh; số vụ đã xác minh xong và chưa xác minh.

- Phục vụ khối lượng công việc của cán bộ xã.
- Không dùng biểu đồ xếp hạng toàn tỉnh để thay thế.
- [CẦN XÁC NHẬN] Vụ có tương đương lô? Đang xử lý thuộc nhóm nào? Tài liệu nhắc công việc tuần này nhưng chưa đủ để bắt buộc thêm thống kê tuần.

## 3.14. USR-02 — Bộ lọc người sử dụng

**[GỐC]** Có:

- Trạng thái: Chưa kiểm tra / Đang xử lý / Đã xong.
- Thôn/Bản/Tiểu khu.
- Loại rừng: Tự nhiên / Trồng.

**[CẦN XÁC NHẬN]** Thôn/bản và tiểu khu là bộ lọc riêng hay chọn loại địa bàn? Có đa chọn? Ánh xạ trạng thái backend?

**[ĐỀ XUẤT]** Kết hợp điều kiện; danh mục theo phạm vi quyền; backend cũng kiểm soát quyền, không chỉ ẩn lựa chọn trên frontend.

## 3.15. USR-03 — Bảng chi tiết từng lô

**[GỐC]** Header tọa độ gộp hai cột con; tổng cộng 12 cột dữ liệu lá:

| Thứ tự | Cột |
|---:|---|
| 1 | Mã lô |
| 2 | Xã |
| 3 | Tiểu khu |
| 4 | Khoảnh |
| 5 | Tọa độ → Longitude (X) |
| 6 | Tọa độ → Latitude (Y) |
| 7 | Trạng thái xác minh |
| 8 | Diện tích xác minh (ha) |
| 9 | Nguyên nhân |
| 10 | Người xác minh |
| 11 | Ngày xác minh |
| 12 | Ghi chú |

- Mỗi dòng là một lô; PH-1286/PH-1285 chỉ là ví dụ.
- Không thay diện tích xác minh bằng diện tích cảnh báo.
- Không điền 0 thay cho chưa có kết quả.
- Không thay người/ngày xác minh bằng người/ngày cập nhật.
- Bảng chữ yêu cầu Longitude (X) = kinh độ, Latitude (Y) = vĩ độ; phải kiểm tra hệ quy chiếu dữ liệu thật.
- [CẦN XÁC NHẬN] Tọa độ hiện trường hay tâm polygon? Hệ quy chiếu? Số chữ số thập phân? Có được fallback sang điểm đại diện không?
- [ĐỀ XUẤT] Cuộn ngang, header dễ theo dõi, chọn dòng liên kết bản đồ nếu phù hợp chức năng có sẵn.

Hình minh họa có thêm thôn/bản và chủ rừng nhưng không được dùng để thay các cột bắt buộc trên. Chưa có yêu cầu đủ rõ để tự xây mới biểu mẫu xác minh, nút lưu, quy trình duyệt.

## 3.16. RPT-01 — Logic báo cáo và thống kê

**[GỐC]** Có các chiều:

- Phạm vi: cấp tỉnh/cấp xã.
- Thời gian: chọn tháng.
- Điều kiện: xác minh/chưa xác minh/nguyên nhân mất rừng.
- Cách trình bày: biểu đồ/văn bản.

### Cấp tỉnh

- Nguồn dữ liệu tổng diện tích mất rừng từng xã.
- Văn bản: danh sách xã, tổng diện tích, người/đơn vị tổng hợp như Chi cục Kiểm lâm/Ban quản lý.
- Biểu đồ: danh sách xã, diện tích, phân nguyên nhân.
- Không dùng bảng chi tiết tất cả lô và chỉ đổi tiêu đề thành cấp tỉnh.

### Cấp xã

- Nguồn dữ liệu từng lô mất rừng.
- Văn bản: danh sách lô, tổng diện tích, người/đơn vị tổng hợp như Hạt kiểm lâm/Trạm quản lý bảo vệ.
- Biểu đồ: khu vực mất rừng, theo nguyên nhân, tổng diện tích.
- [CẦN XÁC NHẬN] Khu vực là lô/thôn/bản/tiểu khu? Mẫu cột báo cáo và phần ký tên? Người tổng hợp là cá nhân hay đơn vị?

### Tháng và điều kiện

- [ĐỀ XUẤT] Chọn tháng kèm năm, hiển thị kỳ báo cáo trên kết quả.
- [CẦN XÁC NHẬN] Tháng căn cứ ngày ảnh/phát hiện/xác minh? Giữ khoảng ngày cũ không? Có nhiều tháng không?
- [CẦN XÁC NHẬN] Xác minh nghĩa là hoàn tất hay đã bắt đầu? Đang xử lý thuộc nhóm nào? Các bộ lọc kết hợp thế nào?
- Dùng danh mục nguyên nhân thật; không loại bản ghi chưa có nguyên nhân khỏi tổng một cách âm thầm.
- [ĐỀ XUẤT] Có Tất cả và Chưa xác định nguyên nhân.

### Nhất quán dữ liệu

**[ĐỀ XUẤT]** Với cùng điều kiện, cùng định nghĩa diện tích và cách làm tròn:

```text
Tổng báo cáo = Tổng nhóm trong bảng = Tổng tương ứng trên biểu đồ
```

Kiểm tra cộng trùng do lịch sử cập nhật, JOIN nhiều lô hiện trạng, lặp cùng vùng qua kỳ ảnh, nhầm diện tích cảnh báo/xác minh, nhầm m²/ha, xuất file không áp dụng bộ lọc.

**[CẦN XÁC NHẬN]** Quy tắc loại trùng và cộng dồn qua kỳ ảnh.

### Xuất dữ liệu

- [HÌNH] Hiện trạng có DOCX/PDF/GeoJSON ở báo cáo; Excel/GeoJSON ở giao diện chính.
- Không tự bỏ vì mô tả mới không nhắc lại.
- Không mặc nhiên coi phải viết mới mọi định dạng.
- [ĐỀ XUẤT] Bảo toàn chức năng đang có; cập nhật điều kiện lọc khi đổi logic; chốt GeoJSON xuất polygon lô hay đối tượng tổng hợp.

---

# 4. MÔ TẢ ĐỘC LẬP TỪNG HÌNH

Các tên `imageN` chỉ là mã tham chiếu nội bộ. Người nhận không cần có ảnh để đọc phần mô tả này.

## Hình 01 — Menu chính hiện tại

**Ảnh:** image1.png; **1906 × 82 px**; **hiện trạng**.

- Ảnh rất rộng, thấp, chụp đầu trang.
- Nhận diện cũ có logo cành lá theo mô tả văn bản và tên `HỆ THỐNG GIÁM SÁT MẤT RỪNG TỈNH SƠN LA`.
- Dãy menu có sáu mục: Giám sát mất rừng; Tra cứu dữ liệu; Báo cáo; Xử lý ảnh viễn thám; Quản lý người dùng; Quản lý phân quyền.
- Ý nghĩa: có sẵn hai mục giám sát/xử lý ảnh, phải khảo sát trước khi đổi thành menu năm mục.
- Không dùng hình này làm mẫu đích.

## Hình 02 — Header và menu tinh chỉnh

**Ảnh:** image2.png; **900 × 301 px**; **mục tiêu**.

- Nội dung chính tổ chức thành hai hàng ngang.
- Hàng trên, phía trái: logo FIS, VFIS, dấu phân cách, tên hệ thống.
- Hàng trên, phía phải: tên đơn vị sử dụng; cụm tài khoản và avatar theo mô tả đi kèm.
- Hàng dưới: năm mục menu ngang, mỗi mục có icon trước chữ.
- Thứ tự: cây rừng/Giám sát mất rừng → kính lúp/Tra cứu dữ liệu → biểu đồ/Báo cáo & thống kê → người/Quản lý người dùng → bảo mật/Quản lý phân quyền.
- Không dùng chiều cao toàn ảnh 301 px làm chiều cao header; khoảng trống của ảnh không phải yêu cầu.
- Chưa xác minh chính xác font, màu, khoảng cách.

```text
[Logo FIS] VFIS | HỆ THỐNG GIÁM SÁT MẤT RỪNG      [Đơn vị] [Tên] [Avatar]
------------------------------------------------------------------------
[Cây] Giám sát mất rừng | [Kính] Tra cứu dữ liệu | [Biểu đồ] Báo cáo & thống kê
[Người] Quản lý người dùng | [Bảo mật] Quản lý phân quyền
```

Sơ đồ xuống dòng để dễ đọc; màn hình đủ rộng bố trí năm mục trên một hàng.

## Hình 03 — Logo FIS

**Ảnh:** image3.jpeg; **229 × 228 px**; **asset thương hiệu**.

- Ảnh gần vuông, đặt tại yêu cầu thay logo cành lá bằng logo FIS.
- Không phải icon cây menu.
- Chưa có đủ căn cứ để mô tả chính xác đường nét, màu hoặc thành phần bên trong logo.
- Nếu không có asset chính thức ở máy đích, phải báo thiếu; không tự lấy logo trùng tên trên mạng hoặc vẽ lại bằng phỏng đoán.

## Hình 04 — Chữ VFIS

**Ảnh:** image4.png; **145 × 39 px**; **cắt chi tiết header**.

- Đại diện cụm chữ VFIS, tên nền tảng.
- Đặt cạnh logo, phân cấp với tên hệ thống, có thể có dấu phân cách theo tổng thể.
- Không phải banner riêng, không phải ảnh nền bắt buộc.
- Nên dùng chữ thật nếu không cần wordmark riêng; chưa xác minh kiểu chữ chính xác.

## Hình 05 — Tên hệ thống

**Ảnh:** image5.png; **283 × 35 px**; **cắt chi tiết**.

- Nội dung: `HỆ THỐNG GIÁM SÁT MẤT RỪNG`.
- Nằm trên hàng nhận diện, sau logo/VFIS.
- Không thêm TỈNH SƠN LA vào chuỗi này để thay tên đơn vị.
- Không bắt buộc hiển thị bằng ảnh chụp chữ hoặc sao kích thước ảnh cắt.

## Hình 06 — Tên đơn vị sử dụng

**Ảnh:** image6.png; **165 × 22 px**; **cắt chi tiết**.

- Nội dung theo văn bản: `CHI CỤC KIỂM LÂM TỈNH SƠN LA`.
- Thuộc cụm phải của header, tách khỏi tên hệ thống và VFIS.
- Hiển thị đủ dấu, không rút gọn tùy ý.

## Hình 07 — Tên tài khoản

**Ảnh:** image7.png; **53 × 16 px**; **cắt chi tiết**.

- Văn bản xác định tên ví dụ là Admin.
- Hiển thị dữ liệu tài khoản đăng nhập, không nhúng ảnh chữ Admin và không hard-code tên.
- Chưa chốt username hay tên hiển thị.

## Hình 08 — Avatar

**Ảnh:** image8.png; **41 × 41 px**; **cắt chi tiết**.

- Ảnh đại diện nhỏ cạnh tên tài khoản trong header.
- Chưa xác minh hình tròn/vuông bo góc hoặc nội dung ảnh mẫu.
- Có dữ liệu dùng ảnh thật; thiếu ảnh dùng fallback phù hợp, không tự suy ra ảnh người mẫu bắt buộc.

## Hình 09 — Giám sát mất rừng

**Ảnh:** image9.png; **151 × 31 px**; **cắt menu**.

- Cấu trúc `[Icon cây rừng] Giám sát mất rừng`.
- Vị trí số 1; icon đứng trước chữ.
- Liên quan yêu cầu đổi tên/chuyển mục Xử lý ảnh viễn thám; không tạo mục trùng.

## Hình 10 — Tra cứu dữ liệu

**Ảnh:** image10.png; **129 × 28 px**; **cắt menu**.

- Cấu trúc `[Icon kính lúp] Tra cứu dữ liệu`.
- Vị trí số 2, giữ tên và chức năng hiện có.

## Hình 11 — Báo cáo & thống kê

**Ảnh:** image11.png; **149 × 28 px**; **cắt menu**.

- Cấu trúc `[Icon biểu đồ] Báo cáo & thống kê`.
- Vị trí số 3, đổi từ Báo cáo; dùng dấu &.
- Cần cả chỉnh logic bên trong, không chỉ đổi nhãn.

## Hình 12 — Quản lý người dùng

**Ảnh:** image12.png; **152 × 28 px**; **cắt menu**.

- Cấu trúc `[Icon hình người] Quản lý người dùng`.
- Vị trí số 4, giữ tên, giữ chức năng, tuân thủ quyền.

## Hình 13 — Quản lý phân quyền

**Ảnh:** image13.png; **150 × 28 px**; **cắt menu**.

- Cấu trúc `[Icon bảo mật] Quản lý phân quyền`.
- Vị trí số 5, giữ tên, không quy định thư viện icon cụ thể.

## Hình 14 — Giao diện chính hiện tại

**Ảnh:** image14.png; **1919 × 945 px**; **hiện trạng**.

- Có header/menu cũ, vùng lựa chọn/lọc, bản đồ, điều khiển lớp, bảng dưới bản đồ và xuất dữ liệu.
- Trên ảnh có chữ Leaflet, cho thấy bản đồ hiện trạng dùng thư viện này; cần kiểm tra mã nguồn để xác nhận phiên bản/cấu trúc thực tế.
- Nhóm lớp có hiện trạng rừng với các loại rừng giàu, rừng trồng, trồng xen, đất trống và mã trạng thái; có lớp mất rừng/xác minh.
- Bên dưới có thông báo số khu vực mất rừng, hướng dẫn bấm dòng xem vị trí, Xuất Excel và Xuất GeoJSON.
- Bảng có mã lô, ngày tháng, diện tích, xã, tọa độ và trạng thái; PH-1286/PH-1285 là ví dụ.
- Tái sử dụng bản đồ/bảng/liên kết/xuất hiện có nếu phù hợp.
- Không sao chép số lượng khu vực, dữ liệu hoặc watermark Activate Windows.

## Hình 15 — Sơ đồ khung giao diện mới

**Ảnh:** image15.png; **751 × 372 px**; **sơ đồ bố cục**.

- Ba cột: Panel trái (Cố định), Không gian trung tâm, Panel phải (Ẩn/Hiện).
- Trái: biểu đồ thống kê, bộ lọc nhanh; văn bản bổ sung chú giải/lớp.
- Trung tâm: ghi khoảng 50–60%; bản đồ với nền vệ tinh, ranh giới, hiện trạng, mất rừng; danh sách/bảng dưới bản đồ và tỷ lệ bản đồ.
- Phải: thông tin vùng mất rừng, thông tin rừng gốc, ảnh vệ tinh, hành động.
- Cả ba cùng màn hình, không tách thành ba trang.
- Nhóm Hành động chỉ là nhóm trong sơ đồ; chưa đủ để tự tạo quy trình mới.

```text
PANEL TRÁI       | KHÔNG GIAN TRUNG TÂM       | PANEL PHẢI
Cố định          | BẢN ĐỒ                     | Ẩn/hiện
Thống kê         | Nền + Ranh giới +          | Lô mất rừng
Bộ lọc           | Hiện trạng + Mất rừng      | Lô hiện trạng
Chú giải/lớp     | BẢNG BÊN DƯỚI             | Ảnh, Hành động
```

## Hình 16 — Tổng thể giao diện lãnh đạo

**Ảnh:** image16.png; **1910 × 889 px**; **mục tiêu minh họa**.

- Tỷ lệ nhận biết xấp xỉ: trái 320 px, giữa 1250 px, phải 340 px. Không phải CSS cố định.
- Trái, từ trên xuống:
  1. THỐNG KÊ ĐIỂM NÓNG: xu hướng diện tích (ha).
  2. BỘ LỌC DỮ LIỆU: ví dụ Kỳ giải đoán Tháng 10/2026, Hành chính Toàn tỉnh.
  3. CÁC LỚP KHÔNG GIAN: nền vệ tinh quang học, ranh giới hành chính xã, hiện trạng gốc với tự nhiên/trồng, cảnh báo với các trạng thái.
- Trung tâm: bản đồ phía trên; bảng phía dưới. Thanh bảng có tên danh sách, Xuất Excel, tìm mã lô/địa điểm/chủ rừng, trạng thái, khoảng ngày.
- Bảng nhận biết: địa bàn xã, đơn vị chịu trách nhiệm, xu hướng tháng trước, số lô cảnh báo, diện tích, tình trạng xử lý/KPI.
- Phải: hồ sơ lô và nút đóng, cảnh báo/biến động, dữ liệu gốc FRMS, ảnh vệ tinh đối chứng, thao tác cuối.
- Hình có địa danh minh họa không hoàn toàn thuộc Sơn La; không sao chép.
- Thứ tự cột chính thức theo bảng chữ ở MGR-03, không theo thứ tự hình nếu khác.

## Hình 17 — Thống kê lãnh đạo

**Ảnh:** image17.png; **319 × 206 px**; **cắt từ Hình 16**.

- Tiêu đề `1. THỐNG KÊ ĐIỂM NÓNG`.
- Nhãn `Xu hướng diện tích (ha)`, thể hiện thời gian.
- Văn bản yêu cầu thêm góc nhìn xếp hạng địa bàn/quản lý/chủ rừng.
- Chưa xác minh số điểm dữ liệu, đường nét, màu chuỗi, giá trị trục; không bịa thông số này.
- Được dùng cột/đường theo văn bản, phải có dữ liệu thật.

## Hình 18 — Bộ lọc lãnh đạo

**Ảnh:** image18.png; **310 × 142 px**; **cắt chi tiết**.

- Tiêu đề `2. BỘ LỌC DỮ LIỆU`.
- Hai dòng dọc: `Kỳ giải đoán: Tháng 10/2026`, `Hành chính: Toàn tỉnh`.
- Các dòng có nhãn/biểu tượng và giá trị chọn.
- Hình chỉ minh họa hai dòng; vẫn phải đáp ứng thời gian từ–đến, hành chính/đơn vị, xác minh và loại rừng theo văn bản.

## Hình 19 — Chú giải/lớp lãnh đạo

**Ảnh:** image19.png; **309 × 340 px**; **cắt chi tiết**.

```text
3. CÁC LỚP KHÔNG GIAN
Nền vệ tinh quang học
Ranh giới hành chính xã
Lớp Hiện trạng rừng (Gốc)
    Rừng tự nhiên
    Rừng trồng
Lớp Cảnh báo Mất rừng
    Mới / Khẩn cấp
    Đang xác minh
    Đã kiểm tra (An toàn)
```

- Có ký hiệu trước lớp; nhóm hiện trạng/cảnh báo phân cấp cha–con.
- Trạng thái có ký hiệu chú giải dạng điểm/tròn.
- Là vùng quản lý lớp và giải thích ký hiệu, không phải chỉ một đoạn văn.
- Chưa chốt màu từng trạng thái; nhãn trong hình phải được ánh xạ với trạng thái backend.

## Hình 20 — Trung tâm lãnh đạo

**Ảnh:** image20.png; **1255 × 892 px**; **cắt vùng giữa**.

- Phần lớn phía trên là không gian bản đồ.
- Phía dưới có thanh `DANH SÁCH LÔ BIẾN ĐỘNG`, Xuất Excel, tìm theo mã lô/địa điểm/chủ rừng, Tất cả trạng thái, khoảng ngày ví dụ 01/10/2026–15/10/2026.
- Bảng tổng hợp xã, đơn vị chịu trách nhiệm, xu hướng tăng/giảm, số lô, diện tích, tình trạng.
- Dù tiêu đề có chữ lô, hàng của lãnh đạo là tổng hợp địa bàn/đơn vị.
- Triển khai cột chính thức theo bảng MGR-03.

## Hình 21 — Panel phải lãnh đạo

**Ảnh:** image21.png; **342 × 788 px**; **cắt chi tiết**.

Từ trên xuống:

1. `Hồ sơ lô: PH-1286`, nút × góc trên phải.
2. `1. CẢNH BÁO (BIẾN ĐỘNG)`: ngày phát hiện, diện tích, độ tin cậy, trạng thái. Ví dụ 15/10/2026, 1.2 ha, mức Cao, cần kiểm tra.
3. `2. DỮ LIỆU GỐC (FRMS)`: địa giới, lâm nghiệp, loại rừng, chủ quản lý. Cấu trúc giá trị: Bản/Xã; TK150/Khoảnh 2/Lô 3; loại rừng tự nhiên núi đất lá rộng nghèo; tên hộ/chủ rừng.
4. `3. ẢNH VỆ TINH ĐỐI CHỨNG`: vùng ảnh và hướng dẫn kéo thanh trượt so sánh.

Phần chữ yêu cầu thêm nguyên nhân, người/ngày cập nhật, ngày thu nhận ảnh và định danh địa bàn. Không bỏ các trường này vì hình không vẽ đủ. Không coi ngày phát hiện = ngày ảnh. Không tự tạo độ tin cậy nếu chưa có nguồn.

## Hình 22 — Tổng thể giao diện người sử dụng

**Ảnh:** image22.png; **1914 × 886 px**; **mục tiêu minh họa**.

- Ba cột tỷ lệ tương tự Hình 16.
- Trái:
  - `1. THỐNG KÊ ĐIỂM NÓNG`: Tổng điểm khẩn 10, Đã đi 5 điểm, Tồn đọng 5 điểm (ví dụ).
  - `2. BỘ LỌC DỮ LIỆU`: Thôn/Bản Tất cả, Trạng thái Chưa kiểm tra.
  - `3. CÁC LỚP KHÔNG GIAN`: cùng cấu trúc lớp lãnh đạo.
- Giữa: bản đồ trên, bảng từng lô dưới; toolbar xuất/tìm kiếm/trạng thái/thời gian.
- Các cột hình gợi ý mã lô, thôn/bản, tiểu khu, khoảnh, tọa độ hiện trường, trạng thái, diện tích, chủ rừng.
- Phải: hồ sơ lô, cảnh báo, dữ liệu gốc, ảnh đối chứng.
- Ở đáy hình có thao tác in liên quan kiểm tra và Lấy mã QR tọa độ; tên đầy đủ nút in chưa nhận dạng chắc chắn.
- Không dùng bảng lãnh đạo cho màn hình này. Không tự xây quy trình in/QR mới nếu chưa xác nhận phạm vi.

## Hình 23 — Thống kê người sử dụng

**Ảnh:** image23.png; **317 × 152 px**; **cắt chi tiết**.

- Khối tổng quan nhỏ trong panel trái, không phải dashboard toàn màn hình.
- Ba đại lượng ví dụ: tổng điểm khẩn 10, đã đi 5, tồn đọng 5.
- Yêu cầu chữ tương ứng tổng cảnh báo theo tháng/phiên ảnh, đã xác minh và chưa xác minh.
- Không mặc nhiên coi đã đi kiểm tra = xác minh hoàn tất.
- Chưa xác minh chính xác dạng đồ họa của biểu đồ; phần chắc chắn là các nhãn/chỉ số.

## Hình 24 — Bộ lọc người sử dụng

**Ảnh:** image24.png; **311 × 147 px**; **cắt chi tiết**.

- Tiêu đề `2. BỘ LỌC DỮ LIỆU`.
- Dòng dọc `Thôn/Bản: Tất cả`, `Trạng thái: Chưa kiểm tra`.
- Văn bản còn yêu cầu Tiểu khu, ba trạng thái Chưa kiểm tra/Đang xử lý/Đã xong và lọc Tự nhiên/Trồng. Không bỏ vì ảnh chưa vẽ.

## Hình 25 — Chú giải/lớp người sử dụng

**Ảnh:** image25.png; **310 × 320 px**; **cắt chi tiết**.

- Nội dung cây lớp giống Hình 19: nền vệ tinh, ranh giới xã, hiện trạng gốc với tự nhiên/trồng, cảnh báo với mới/khẩn cấp, đang xác minh, đã kiểm tra.
- Có thể dùng chung component, nhưng phạm vi dữ liệu theo tài khoản.
- Không cấp quyền toàn tỉnh chỉ vì tái sử dụng giao diện lãnh đạo.

## Hình 26 — Trung tâm người sử dụng

**Ảnh:** image26.png; **1257 × 891 px**; **cắt vùng giữa**.

- Trên là bản đồ; dưới là toolbar và bảng chi tiết.
- Toolbar: Danh sách lô biến động, Xuất Excel, tìm mã lô/địa điểm/chủ rừng, trạng thái, khoảng ngày.
- Nhãn cột nhận biết từ hình tổng thể tương ứng: Mã lô, Thôn/Bản, Tiểu khu, Khoảnh, Tọa độ hiện trường gồm Longitude (X)/Latitude (Y), Trạng thái (Action), DT (ha), Chủ rừng.
- Ví dụ một dòng: PH-1286, một bản, tiểu khu 150, khoảnh 2, kinh độ 104.2341, vĩ độ 22.1523, Mới/Cần đi, 1.2 ha, tên hộ.
- Dòng khác có trạng thái Đã nộp biên bản. Tất cả chỉ là ví dụ.

**Quy tắc chống hiểu sai:** Giữ 12 cột chính thức ở USR-03. Không thay Xã bằng Thôn/Bản, Người xác minh bằng Chủ rừng, Diện tích xác minh bằng diện tích cảnh báo; không bỏ Nguyên nhân/Ngày xác minh/Ghi chú. Thôn/bản và chủ rừng là cột bổ sung cần xác nhận.

## Hình 27 — Panel phải người sử dụng

**Ảnh:** image27.png; **344 × 769 px**; **cắt chi tiết**.

- Đầu panel: Hồ sơ lô [mã], nút ×.
- Nhóm 1 Cảnh báo: ngày phát hiện, diện tích, độ tin cậy, trạng thái.
- Nhóm 2 Dữ liệu gốc FRMS: địa giới, lâm nghiệp, loại rừng, chủ quản lý.
- Nhóm 3 Ảnh vệ tinh đối chứng: vùng so sánh và hướng dẫn kéo thanh trượt.
- Bổ sung đủ các trường DETAIL-01 theo văn bản; nhóm hiện trạng người sử dụng có thôn/xã.
- Hai ảnh có nhãn trước/sau là yêu cầu gốc; thanh kéo là chi tiết hình chưa chốt bắt buộc.

## Hình 28 — Báo cáo hiện tại

**Ảnh:** image28.png; **1919 × 947 px**; **hiện trạng**.

Từ trên xuống:

1. Header/menu cũ.
2. Tiêu đề `BÁO CÁO PHÁT HIỆN SỚM MẤT RỪNG`.
3. Điều kiện: Từ ngày, Đến ngày, Xã, Xác minh, Loại báo cáo, nút Báo cáo. Ví dụ 01/01/2026–01/06/2026, xã Cò Mạ, loại Văn bản.
4. Nút Xuất DOCX, Xuất PDF, Xuất GeoJSON.
5. Nội dung `BẢNG THỐNG KÊ PHÁT HIỆN MẤT RỪNG`, thông tin tỉnh Sơn La/khoảng ngày/xã.
6. Bảng: STT, Xã, Lô phát hiện, Tiểu khu, Khoảnh, Tọa độ hai cột, Diện tích ha.

- Nhãn tọa độ hiện trạng có dấu hiệu đảo so với giá trị (103.x và 21.x). Phải kiểm tra dữ liệu/hệ quy chiếu, không sao nhãn sai.
- Sửa theo logic cấp tỉnh/xã, tháng, nguyên nhân/xác minh, biểu đồ/văn bản.
- Không dùng nguyên bảng lô hiện trạng cho cả hai cấp.
- Không sao watermark hoặc dữ liệu mẫu.

---

# 5. SƠ ĐỒ LOGIC BÁO CÁO CUỐI WORD

Sơ đồ này là các thành phần văn bản/đồ họa trong Word, không có một ảnh media độc lập ngoài 28 ảnh trên.

```text
BÁO CÁO & THỐNG KÊ
│
├── PHẠM VI
│   ├── CẤP TỈNH → Tổng diện tích mất rừng từng xã
│   └── CẤP XÃ   → Dữ liệu từng lô mất rừng
│
├── THỜI GIAN → Chọn tháng
│
├── ĐIỀU KIỆN
│   ├── Xác minh
│   ├── Chưa xác minh
│   └── Theo từng nguyên nhân mất rừng
│
└── CÁCH HIỂN THỊ
    ├── BIỂU ĐỒ
    │   ├── Tỉnh: xã × diện tích × nguyên nhân
    │   └── Xã: khu vực × diện tích × nguyên nhân
    └── VĂN BẢN
        ├── Tỉnh: danh sách xã + tổng diện tích + đơn vị tổng hợp
        └── Xã: danh sách lô + tổng diện tích + đơn vị tổng hợp
```

Nút đơn vị tổng hợp cấp tỉnh nêu Chi cục Kiểm lâm/Ban quản lý; cấp xã nêu Hạt kiểm lâm/Trạm quản lý bảo vệ. Chưa đủ để chốt mẫu ký tên, chức danh hoặc trường người tổng hợp.

---

# 6. QUY TẮC DỮ LIỆU VÀ TÍCH HỢP

## 6.1. Những khái niệm phải phân biệt

| Khái niệm | Không đánh đồng với |
|---|---|
| Lô mất rừng/cảnh báo | Lô hiện trạng rừng |
| Diện tích cảnh báo | Diện tích xác minh |
| Ngày thu nhận ảnh | Ngày phát hiện/cập nhật/xác minh |
| Người cập nhật | Người xác minh/người tổng hợp |
| Trạng thái xử lý | Nguyên nhân mất rừng |
| Nguồn gốc rừng | Mục đích sử dụng rừng |
| Tổng hợp xã | Chi tiết từng lô |
| Phiên ảnh/kỳ giải đoán | Tháng lịch |
| Đã đi kiểm tra | Đã xác minh hoàn tất |

## 6.2. Dữ liệu cần kiểm tra có sẵn

Đây là khái niệm, không phải yêu cầu tạo cột tên cố định:

- Lô cảnh báo: định danh, mã, polygon, xã, thôn/bản nếu có, tiểu khu/khoảnh, hai loại diện tích, trạng thái, nguyên nhân, ngày ảnh, kỳ ảnh, người/ngày cập nhật, người/ngày xác minh, tọa độ, ghi chú.
- Hiện trạng: định danh, polygon, địa bàn, tiểu khu/khoảnh/lô, loại đất/rừng, chủ quản lý.
- Danh mục: hành chính, thôn/bản, quản lý, trạng thái, nguyên nhân, phân loại rừng.
- Liên kết cảnh báo–hiện trạng, nguồn ảnh trước/sau, tài khoản và phạm vi quyền.

Thiếu dữ liệu phải báo, không dùng dữ liệu giả để làm giao diện trông hoàn chỉnh.

## 6.3. Ma trận khác biệt hai nhóm

| Thành phần | Lãnh đạo | Người sử dụng |
|---|---|---|
| Thống kê | Diễn biến, xếp hạng | Khối lượng công việc/xác minh |
| Địa bàn lọc | Hành chính/đơn vị | Thôn/bản/tiểu khu |
| Loại rừng | Danh sách rộng hơn | Tự nhiên/trồng |
| Bảng | Tổng hợp 7 cột | Chi tiết 12 cột lá |
| Địa bàn hiện trạng | Xã/huyện | Thôn/xã |
| Bản đồ/hover/click | Có | Có |
| Panel/ảnh | Có | Có |

---

# 7. CÁC ĐIỂM PHẢI XÁC NHẬN

## 7.1. Ưu tiên cao, ảnh hưởng chức năng/số liệu

1. Hợp nhất menu Giám sát mất rừng và Xử lý ảnh viễn thám thế nào?
2. Ánh xạ role và phạm vi địa bàn/quản lý của hai giao diện?
3. Danh mục trạng thái chuẩn và ánh xạ mọi nhãn trong hình/văn bản?
4. Mỗi chỉ tiêu dùng diện tích cảnh báo hay xác minh?
5. Tháng/kỳ báo cáo dựa ngày ảnh, phát hiện hay xác minh?
6. Liên kết lô cảnh báo–hiện trạng thế nào? Giao nhiều lô xử lý sao?
7. Cùng vùng lặp nhiều kỳ ảnh cộng dồn hay loại trùng?
8. Xu hướng theo diện tích hay số lô? So sánh khoảng ngày thế nào?
9. Bảng lãnh đạo nhóm xã hay xã–đơn vị? Tiến độ 2/5 nghĩa gì?

## 7.2. Ưu tiên tiếp theo

10. Tách nguồn gốc/mục đích sử dụng rừng thế nào?
11. Tọa độ hiện trường/đại diện, hệ quy chiếu và độ chính xác?
12. Nguồn hai ảnh và xử lý thiếu ảnh?
13. Màu đỏ/cam/vàng ứng trạng thái nào?
14. Biểu đồ cấp xã nhóm theo gì?
15. Người tổng hợp là cá nhân/đơn vị, mẫu văn bản và ký tên?
16. Phạm vi bảo toàn/cập nhật các chức năng xuất?
17. Asset logo, tên đơn vị cấu hình hay cố định?
18. Thanh kéo ảnh, nút in/QR có thuộc phạm vi bắt buộc không?
19. Yêu cầu responsive/mobile và tỷ lệ panel?

Không cần chờ mọi điểm hình thức để khảo sát mã nguồn; không chốt truy vấn nghiệp vụ khi các định nghĩa quan trọng còn mơ hồ.

---

# 8. TRÌNH TỰ TRIỂN KHAI ĐỀ XUẤT

1. **Khảo sát:** xác định đúng mã nguồn đang chạy; đọc hướng dẫn dự án; tìm header/menu/routes/map/table/auth/API/detail/report/export.
2. **Ánh xạ:** lập bảng yêu cầu → component/API/trường dữ liệu; liệt kê phần sẵn có và thiếu.
3. **Chốt nghiệp vụ:** role, quyền, trạng thái, diện tích, ngày/kỳ, tổng hợp, liên kết không gian, màu.
4. **Header/menu:** logo và chữ, tài khoản, năm mục; không mất chức năng.
5. **Khung chung:** panel trái, map–table, panel phải, hover/click/lớp.
6. **Hai giao diện:** biểu đồ/bộ lọc/bảng khác nhau; trường địa bàn chi tiết khác nhau.
7. **Báo cáo:** hai cấp, tháng, trạng thái/nguyên nhân, biểu đồ/văn bản, xuất trong phạm vi.
8. **Kiểm thử:** số liệu biết trước, hai nhóm tài khoản, thiếu/rỗng/lỗi/nhiều dữ liệu, hồi quy chức năng cũ.

---

# 9. CHECKLIST NGHIỆM THU

## Header/menu

- [ ] Logo FIS chính thức, không phải placeholder giả nhận diện.
- [ ] Có VFIS, tên hệ thống, tên đơn vị đúng chữ.
- [ ] Tài khoản thực và avatar/fallback.
- [ ] Năm mục đúng thứ tự/icon; không trùng mục giám sát.
- [ ] Không mất xử lý ảnh, quản trị hoặc quyền hiện có ngoài chủ ý.

## Khung/map

- [ ] Ba vùng, bảng dưới map, panel phải đóng/mở.
- [ ] Hover gọn, click đúng lô, không hiển thị dữ liệu cũ.
- [ ] Thứ tự lớp đúng, chú giải khớp, không che polygon cảnh báo.
- [ ] Đổi kích thước/panel không làm map lỗi.

## Lãnh đạo

- [ ] Thống kê thời gian và xếp hạng.
- [ ] Đủ nhóm lọc.
- [ ] Bảy cột đúng thứ tự, đúng cấp tổng hợp.
- [ ] Xu hướng, diện tích, tiến độ có định nghĩa được xác nhận.

## Người sử dụng

- [ ] Tổng cảnh báo/đã/chưa xác minh.
- [ ] Lọc trạng thái, thôn/bản/tiểu khu, tự nhiên/trồng.
- [ ] 12 cột lá đúng; không đổi trường xác minh thành cập nhật.
- [ ] Tọa độ đúng trục/hệ, không tự suy ra điểm hiện trường.
- [ ] Không điền 0 thay dữ liệu thiếu.

## Chi tiết/ảnh

- [ ] Đủ trường lô cảnh báo và lô hiện trạng, phân biệt hai đối tượng.
- [ ] Địa bàn lãnh đạo xã/huyện, người sử dụng thôn/xã theo nguồn dữ liệu phù hợp.
- [ ] Ngày ảnh/cập nhật/xác minh không lẫn.
- [ ] Hai ảnh đúng vùng, nhãn trước/sau; thiếu dữ liệu thông báo rõ.

## Báo cáo/dữ liệu

- [ ] Tỉnh tổng hợp xã, xã chi tiết lô.
- [ ] Có tháng, xác minh/chưa xác minh, nguyên nhân, biểu đồ/văn bản.
- [ ] Tổng bảng/biểu đồ/file xuất nhất quán cùng điều kiện.
- [ ] Không cộng trùng do JOIN/lịch sử/kỳ ảnh ngoài quy tắc.
- [ ] Không nhầm m²/ha hoặc làm tròn gây sai tổng không giải thích.
- [ ] Kiểm tra quyền backend, không chỉ ẩn UI.

---

# 10. CHỈ DẪN GỬI AGENT TRIỂN KHAI

> Hãy triển khai theo tài liệu này như bản đặc tả độc lập; máy của bạn không có Word gốc. Đọc phần yêu cầu và mô tả 28 hình, phân biệt hiện trạng/mục tiêu/ảnh cắt. Khảo sát trước khi sửa. Lập ánh xạ yêu cầu với component, route, API và dữ liệu thực tế. Không chỉ dựng UI tĩnh. Không coi đề xuất hoặc chi tiết hình chưa chốt là yêu cầu khách hàng đã xác nhận. Các điểm nghiệp vụ chưa rõ phải báo trước khi quyết định. Thiếu logo/ảnh/dữ liệu phải ghi rõ, không tạo dữ liệu giả. Không tự xóa chức năng cũ, đổi thuật toán hoặc mở rộng quyền. Khi bàn giao, liệt kê file sửa, yêu cầu hoàn thành, thay đổi API/dữ liệu, kiểm thử và phần còn thiếu.

**Trọng tâm dễ sai nhất:** hợp nhất menu, ánh xạ trạng thái, định nghĩa diện tích, mốc thời gian và cấp độ tổng hợp số liệu. Độ đúng nghiệp vụ quan trọng hơn việc làm giao diện trông giống một ảnh mẫu với số liệu giả.
