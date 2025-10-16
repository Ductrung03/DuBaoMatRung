# Đặc tả Tính năng: Dọn dẹp và Tối ưu hóa Codebase

**Nhánh tính năng**: `002-codebase-cleanup`
**Ngày tạo**: 2025-10-16
**Trạng thái**: Bản nháp
**Đầu vào**: Mô tả từ người dùng: "là một chuyên gia Vibe coding hãy làm các yêu cầu sau: - Hãy xem lại project của tôi xem đã thật sự clean tối ưu chưa, vị trí phân chia các file các folder đã hợp lý chưa, phần nào, file nào, folder nào bị thừa không cần thiết thì xóa đi - Project của tôi khi chạy in rất nhiều thông tin ra console ở web điều này không tốt chút nào hãy giúp tôi xóa hết đi"

## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*

### User Story 1 - Console của Lập trình viên Sạch sẽ (Ưu tiên: P1)

Với tư cách là một lập trình viên, tôi muốn chạy ứng dụng và kiểm tra console của trình duyệt mà không thấy bất kỳ thông báo gỡ lỗi nào, để tôi có thể dễ dàng phát hiện các cảnh báo hoặc lỗi hợp lệ và có trải nghiệm phát triển sạch sẽ hơn.

**Lý do ưu tiên**: Việc xóa bỏ các câu lệnh console là một yêu cầu trực tiếp và có tác động lớn từ người dùng, giúp cải thiện chất lượng hoạt động của ứng dụng và làm cho việc gỡ lỗi hiệu quả hơn.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách chạy ứng dụng frontend, điều hướng qua một số trang/tính năng và quan sát console của lập trình viên trên trình duyệt. Kiểm thử được coi là thành công nếu không có thông báo nào từ mã nguồn của ứng dụng (ví dụ: `console.log`, `warn`, `info`) xuất hiện.

**Kịch bản nghiệm thu**:

1.  **Cho trước** ứng dụng đang chạy trong môi trường phát triển, **Khi** một lập trình viên mở console của trình duyệt và điều hướng trong ứng dụng, **Thì** không có thông báo log nào ở cấp độ ứng dụng (ví dụ: từ `console.log`) được hiển thị.
2.  **Cho trước** ứng dụng được build cho môi trường production, **Khi** người dùng sử dụng ứng dụng, **Thì** không có thông báo log nào ở cấp độ ứng dụng được xuất ra console của trình duyệt.

---

### User Story 2 - Cấu trúc Dự án được Tối ưu hóa (Ưu tiên: P2)

Với tư cách là một lập trình viên, tôi muốn cấu trúc tệp của dự án không chứa các tệp và thư mục không sử dụng hoặc mặc định (boilerplate), để tôi có thể điều hướng codebase dễ dàng hơn và hiểu kiến trúc dự án mà không bị nhầm lẫn.

**Lý do ưu tiên**: Điều này giải quyết yêu cầu của người dùng về một cấu trúc dự án 'sạch sẽ và tối ưu', giúp cải thiện khả năng bảo trì và quá trình tiếp nhận của lập trình viên mới. Đây là P2 vì nó đòi hỏi nhiều phân tích và xác nhận hơn là chỉ xóa log.

**Kiểm thử độc lập**: Có thể kiểm thử bằng cách xem xét danh sách các tệp/thư mục được đề xuất xóa và xác nhận chúng thực sự không cần thiết. Sau khi xóa, dự án phải build và chạy một cách chính xác.

**Kịch bản nghiệm thu**:

1.  **Cho trước** một lập trình viên đã phân tích codebase để tìm các tệp dư thừa, **Khi** họ trình bày một danh sách các tệp/thư mục cần xóa, **Thì** chủ sở hữu dự án xác nhận danh sách đó là chính xác.
2.  **Cho trước** danh sách các tệp/thư mục không cần thiết được phê duyệt, **Khi** các tệp/thư mục đó bị xóa, **Thì** toàn bộ ứng dụng (frontend và backend) có thể được build thành công và tất cả các bài kiểm thử đều vượt qua.

### Các trường hợp ngoại lệ

-   Điều gì xảy ra nếu một câu lệnh `console.log` được dùng cho mục đích gỡ lỗi tạm thời hợp lệ bởi một lập trình viên khác? Giả định: Tất cả các câu lệnh `console.log` hiện tại được coi là nhiễu gỡ lỗi vĩnh viễn và an toàn để xóa. Việc gỡ lỗi trong tương lai nên sử dụng các câu lệnh tạm thời hoặc một thư viện ghi log phù hợp.
-   Hệ thống xử lý việc xóa một tệp được import hoặc require bất ngờ bởi một tệp khác như thế nào? Quá trình build và bộ kiểm thử sẽ thất bại, ngăn chặn thay đổi được hợp nhất.

## Yêu cầu *(bắt buộc)*

### Yêu cầu chức năng

-   **FR-001**: Hệ thống KHÔNG ĐƯỢC xuất bất kỳ thông báo nào qua `console.log`, `console.info`, `console.warn`, hoặc `console.debug` từ mã nguồn ứng dụng frontend (`client/src`) trong quá trình chạy.
-   **FR-002**: Codebase của dự án PHẢI được phân tích để xác định các tệp và thư mục không sử dụng, mặc định (boilerplate), hoặc dư thừa.
-   **FR-003**: Một danh sách cuối cùng các tệp và thư mục cần xóa PHẢI được tạo ra để xem xét.
-   **FR-004**: Hệ thống PHẢI xóa các tệp và thư mục đã được phê duyệt khỏi codebase.
-   **FR-005**: Ứng dụng PHẢI build, chạy và vượt qua tất cả các bài kiểm thử hiện có sau khi các tệp, thư mục và console log được chỉ định đã bị xóa.

### Các thực thể chính *(bao gồm nếu tính năng liên quan đến dữ liệu)*

-   **Tệp/Thư mục**: Một thực thể hệ thống tệp trong cấu trúc dự án là ứng cử viên để xóa.
-   **Câu lệnh Console Log**: Một câu lệnh trong mã JavaScript (ví dụ: `console.log(...)`) là ứng cử viên để xóa.

## Tiêu chí thành công *(bắt buộc)*

### Kết quả có thể đo lường

-   **SC-001**: 100% các câu lệnh `console.log` (và các câu lệnh liên quan) trong thư mục `client/src` được xóa bỏ.
-   **SC-002**: Ứng dụng build thành công và tất cả các bài kiểm thử hiện có đều vượt qua sau khi dọn dẹp.
-   **SC-003**: Trải nghiệm của lập trình viên được cải thiện bằng cách cung cấp một đầu ra console sạch hơn và một cấu trúc dự án hợp lý hơn (Định tính, sẽ được người dùng xác nhận).
-   **SC-004**: Không có bất kỳ tác động nào đến chức năng hiện có của ứng dụng; tất cả các tính năng hoạt động như trước khi dọn dẹp.
