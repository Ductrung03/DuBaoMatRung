# API cho GIS & Admin (Tự xây dựng)

**Ngày**: 2025-10-16

## Phương pháp tiếp cận

Do chúng ta đã chuyển sang kiến trúc "Tự Host" và không sử dụng Supabase, các API cho `gis-service` và `admin-service` sẽ **phải được xây dựng thủ công** sử dụng framework Express.js hiện có.

Điều này có nghĩa là chúng ta sẽ cần tạo các routes, controllers, và service logic để xử lý các yêu cầu HTTP, tương tác với CSDL bằng Kysely Query Builder, và trả về dữ liệu.

## Các Endpoint cần xây dựng (Ví dụ)

Dưới đây là một số ví dụ về các API endpoint mà chúng ta cần phải tự implement.

### Lấy danh sách các sự kiện mất rừng (có phân trang và lọc)

`GET /api/v1/gis/mat-rung`

**Query Params:**
- `limit` (number): Số lượng bản ghi mỗi trang.
- `offset` (number): Vị trí bắt đầu lấy.
- `mahuyen` (string): Lọc theo mã huyện.
- `detection_status` (string): Lọc theo trạng thái xác minh.

### Lấy chi tiết một sự kiện mất rừng

`GET /api/v1/gis/mat-rung/:gid`

### Cập nhật trạng thái một sự kiện mất rừng

`PATCH /api/v1/gis/mat-rung/:gid`

**Nội dung (Body):**
```json
{
  "detection_status": "Đã xác minh",
  "verification_notes": "Đã kiểm tra thực địa."
}
```

### Lấy dữ liệu ranh giới hành chính (huyện)

`GET /api/v1/admin/ranh-gioi/huyen`

## Tác động

- **Tăng khối lượng công việc**: So với việc dùng API tự động của Supabase, việc tự xây dựng các endpoint này sẽ tốn nhiều thời gian phát triển hơn.
- **Linh hoạt**: Chúng ta có toàn quyền kiểm soát logic và định dạng của API response.
