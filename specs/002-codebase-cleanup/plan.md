# Kế hoạch Triển khai: Dọn dẹp và Tối ưu hóa Codebase

**Nhánh tính năng**: `002-codebase-cleanup`
**Đặc tả tính năng**: `specs/002-codebase-cleanup/spec.md`
**Trạng thái**: Đang tiến hành

## Bối cảnh Kỹ thuật

-   **Công nghệ**: JavaScript/React (với Vite), Node.js, Express.js.
-   **Mã nguồn bị ảnh hưởng**:
    -   `client/src/`: Tất cả các file sẽ được quét để tìm và xóa các câu lệnh `console.log`.
    -   Toàn bộ dự án: Toàn bộ cấu trúc file sẽ được phân tích để xác định và xóa các file/thư mục không sử dụng.
-   **Chiến lược Kiểm thử**:
    -   Chạy `npm test` để thực thi các unit/integration test hiện có.
    -   Chạy lệnh build frontend (`npm run build` trong thư mục `client`) để đảm bảo hoàn tất thành công.
    -   Chạy ứng dụng thủ công và kiểm tra console của trình duyệt để xác minh không có thông báo log nào xuất hiện.
-   **Các phụ thuộc**: Sẽ không có phụ thuộc mới nào được thêm vào.
-   **Các điểm tích hợp**: Không có thay đổi nào đối với các điểm tích hợp. Các thay đổi đều nằm trong nội bộ codebase.
-   **Các điểm chưa rõ**:
    -   `[CẦN LÀM RÕ: Cần phải biên soạn và được chủ sở hữu dự án phê duyệt một danh sách cuối cùng các tệp và thư mục có thể xóa một cách an toàn.]`

## Kiểm tra Hiến pháp

*Phần này sẽ được đánh giá lại sau giai đoạn thiết kế.*

-   **Tuân thủ Nguyên tắc**: File hiến pháp là một mẫu; do đó, không có nguyên tắc cụ thể nào có thể được kiểm tra. Kế hoạch tuân thủ các thông lệ tốt nhất chung về cải thiện chất lượng mã nguồn.
-   **Đánh giá các cổng kiểm soát**:
    -   **Cổng Test-First**: Vượt qua. Kế hoạch bao gồm việc chạy các bài kiểm thử hiện có để đảm bảo không có lỗi hồi quy nào được đưa vào.
    -   **Cổng Đơn giản**: Vượt qua. Toàn bộ mục đích của tính năng này là đơn giản hóa codebase bằng cách loại bỏ các yếu tố không cần thiết.
    -   **Cổng Quan sát được (Observability)**: Không áp dụng. Tính năng này đang xóa bỏ logging, không phải thêm mới.

## Giai đoạn 0: Phác thảo & Nghiên cứu

Nhiệm vụ nghiên cứu chính là xác định những file và thư mục nào không cần thiết và có thể xóa một cách an toàn.

-   **Nhiệm vụ 1**: Phân tích thư mục `client` để tìm các file boilerplate từ mẫu Vite React chưa được sửa đổi hoặc sử dụng.
-   **Nhiệm vụ 2**: Phân tích thư mục gốc và các thư mục dịch vụ khác để tìm các file rõ ràng không sử dụng (ví dụ: config cũ, script kiểm thử không còn liên quan).
-   **Nhiệm vụ 3**: Tổng hợp các phát hiện vào `research.md` với một danh sách rõ ràng các ứng viên để xóa và lý do cho mỗi ứng viên.

*Giai đoạn này sẽ được hoàn thành bằng cách tạo ra file `research.md`.*

## Giai đoạn 1: Thiết kế & Hợp đồng

-   **Mô hình Dữ liệu (`data-model.md`)**: Không có thực thể dữ liệu mới nào được giới thiệu. Tạo phẩm này không bắt buộc.
-   **Hợp đồng API (`/contracts`)**: Không có điểm cuối API mới nào được tạo. Tạo phẩm này không bắt buộc.
-   **Hướng dẫn Nhanh (`quickstart.md`)**: Một hướng dẫn sẽ được tạo để phác thảo các bước xác minh việc dọn dẹp.
-   **Cập nhật Ngữ cảnh Agent**: Script `.specify/scripts/bash/update-agent-context.sh` sẽ được chạy để cập nhật kiến thức của agent về ngăn xếp công nghệ của dự án, mặc dù không có công nghệ mới nào được mong đợi sẽ được thêm vào.

## Giai đoạn 2: Các nhiệm vụ Triển khai

*Phần này sẽ được điền bởi lệnh `/speckit.tasks` sau khi kế hoạch được phê duyệt.*
