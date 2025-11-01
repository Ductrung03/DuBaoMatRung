# Hợp đồng API: Dịch vụ Auth (Nội bộ)

Tài liệu này định nghĩa API endpoint nội bộ mới trong `auth-service` sẽ được sử dụng cho giao tiếp giữa các dịch vụ (service-to-service). Endpoint này thay thế cho việc truy vấn cơ sở dữ liệu trực tiếp từ `gis-service` đến `auth_db`.

## Endpoint: Lấy thông tin người dùng cho các dịch vụ nội bộ

- **Phương thức**: `GET`
- **Đường dẫn**: `/api/auth/internal/user-info`
- **Mục đích**: Cung cấp một cách an toàn và hiệu quả cho các microservice khác lấy thông tin cơ bản của nhiều người dùng trong một yêu cầu hàng loạt (batch request).

---

### 1. Bảo mật

- **Xác thực**: Endpoint này BẮT BUỘC phải được bảo vệ và chỉ có thể truy cập bởi các microservice nội bộ khác.
- **Khuyến nghị**: Triển khai cơ chế "shared secret" hoặc API key. Dịch vụ gọi (ví dụ: `gis-service`) phải bao gồm một header `X-Internal-Api-Key` cụ thể trong yêu cầu của mình. Gateway sẽ không công khai route này ra bên ngoài.

---

### 2. Yêu cầu (Request)

- **Tham số truy vấn (Query Parameters)**:
  - `ids` (bắt buộc, chuỗi): Một chuỗi các ID người dùng được phân tách bằng dấu phẩy. Ví dụ: `?ids=1,5,23`

- **Yêu cầu Mẫu** (từ `gis-service` đến `auth-service`):
  ```http
  GET /api/auth/internal/user-info?ids=1,5,23 HTTP/1.1
  Host: auth-service:3001
  X-Internal-Api-Key: [GIÁ_TRỊ_SHARED_SECRET]
  ```

---

### 3. Phản hồi (Thành công)

- **Mã trạng thái**: `200 OK`
- **Content-Type**: `application/json`
- **Cấu trúc Body**: Một đối tượng JSON chứa trường `data`. Trường `data` là một map trong đó key là các ID người dùng đã yêu cầu và value là các đối tượng chứa thông tin người dùng. Nếu không tìm thấy ID người dùng, giá trị của nó sẽ là `null`.

- **Body Phản hồi Mẫu**:
  ```json
  {
    "success": true,
    "data": {
      "1": {
        "id": 1,
        "fullName": "Nguyen Van A",
        "organization": "Chi Cục Kiểm Lâm Vùng I"
      },
      "5": {
        "id": 5,
        "fullName": "Tran Thi B",
        "organization": "Hạt Kiểm Lâm Sa Pa"
      },
      "23": null
    }
  }
  ```

---

### 4. Phản hồi (Lỗi)

- **Nếu `X-Internal-Api-Key` bị thiếu hoặc không hợp lệ**:
  - **Mã trạng thái**: `401 Unauthorized`
  - **Body**:
    ```json
    {
      "success": false,
      "message": "Unauthorized: Invalid or missing internal API key."
    }
    ```

- **Nếu tham số truy vấn `ids` bị thiếu**:
  - **Mã trạng thái**: `400 Bad Request`
  - **Body**:
    ```json
    {
      "success": false,
      "message": "Bad Request: The 'ids' query parameter is required."
    }
    ```