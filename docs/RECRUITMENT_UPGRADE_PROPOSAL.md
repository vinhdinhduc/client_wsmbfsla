# Đề xuất email tuyển dụng

## Phạm vi đã kiểm tra

- API nộp hồ sơ vẫn là `POST /public/job-applications`, multipart với các trường hiện có. Không thêm cột vào `jobs` hay `job_applications`.
- Email và CV hiện bắt buộc; giữ cấu hình này. Giới thiệu giới hạn 1.000 ký tự ở cả giao diện và server.
- CV đã nằm trong `server/private/cv`, tên UUID; đường tải chỉ dành cho tài khoản có quyền quản lý tuyển dụng. Bổ sung kiểm tra MIME, nội dung, đường dẫn và dọn tệp khi hồ sơ bị từ chối.
- Tin tạm dừng vẫn xem được ở địa chỉ cũ; bản nháp không công khai. Tin hết hạn hơn 30 ngày hoặc tạm dừng không cập nhật hơn 30 ngày dùng `noindex`, dựa trên `deadline`/`updated_at` có sẵn. Ngày hạn tính theo giờ Việt Nam.

## Hai mẫu email đề nghị duyệt

1. `job_application_received_candidate`
   - Tên: **Xác nhận đã nhận hồ sơ – gửi ứng viên**.
   - Tiêu đề: `Đã nhận hồ sơ {{application_code}} – {{job_title}}`.
   - Nội dung: chào `{{customer_name}}`, xác nhận mã hồ sơ và vị trí, trình bày bốn bước tiếp nhận → sơ loại → phỏng vấn → thông báo kết quả; hướng dẫn giữ mã và liên hệ `{{hotline}}` khi cần. Không hứa thời gian phản hồi chưa được quy định.
   - Mặc định bật; chỉ đưa vào hàng đợi khi hồ sơ có email hợp lệ.
2. `job_application_new_staff`
   - Tên: **Có hồ sơ mới – gửi nhân viên**.
   - Tiêu đề: `Hồ sơ mới {{application_code}} – {{job_title}}`.
   - Nội dung: mã, vị trí, tên `{{customer_name}}`, SĐT `{{phone}}`; nút **Xem hồ sơ** dẫn `{{confirm_url}}` tới `/admin/jobs#applications`.
   - Gửi tới `notify_email` hiện có. Không đính kèm CV và không đưa đường dẫn CV công khai vào thư.

Hai mẫu dùng logo, header/footer, hotline và cấu hình email chung đang có. Gửi qua outbox với khóa chống gửi lặp; lỗi email không làm thất bại hồ sơ đã lưu.

## Biến mới cần duyệt

| Biến | Nguồn | Ví dụ |
| --- | --- | --- |
| `{{job_title}}` | `jobs.title`; nếu nộp nguồn ứng viên dùng “Nguồn ứng viên” | Giao dịch viên cửa hàng Trung tâm |
| `{{application_code}}` | `job_applications.code` | UV-261006-ABCDEF1234 |

Dùng lại `customer_name`, `phone`, `branch_name`, `hotline`, `confirm_url`. Không thêm biến dữ liệu cá nhân nào khác.

Nếu duyệt, bổ sung hai bản ghi mẫu vào `email_templates` bằng migration riêng, không ghi đè mẫu thư đang được chỉnh sửa. Không đổi API/schema hồ sơ.
