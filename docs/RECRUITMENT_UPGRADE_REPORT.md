# Nâng cấp tuyển dụng và logo sidebar admin

## Đã thực hiện

- Logo MobiFone trắng/đỏ trên nền xanh ở cuối sidebar, dưới “Xem trang chủ”; kiểm tra trên desktop và mobile.
- Hero có badge, địa điểm, số lượng, nhóm ngành, hình thức, hạn nộp và số ngày còn lại theo giờ Việt Nam. Có CTA cuộn tới form, chia sẻ/copy, Facebook và chia sẻ qua ứng dụng hoặc copy sang Zalo.
- Desktop có cột tóm tắt sticky; mobile có CTA đáy, ẩn khi form xuất hiện và sau khi gửi thành công. Quy trình bốn bước nằm gần đầu trang; gợi ý vị trí khác đang tuyển.
- Nội dung qua allowlist HTML `p/ul/ol/li/strong/em/a/h2–h4/br`. Văn bản cũ được chuyển thành danh sách khi hiển thị; giữ xuống dòng và khoảng lương “7 - 10”. Không cập nhật hàng loạt nội dung trong DB. Khối “Vì sao làm việc…” lấy ba quyền lợi thực tế nếu có đủ nội dung.
- Form có nhãn, gợi ý, lỗi theo trường, giới thiệu tối đa 1.000 ký tự, dropzone tiếng Việt, kiểm tra CV, tên/dung lượng/xóa tệp và tiến trình tải thực tế. Consent mặc định bỏ chọn, nội dung đúng mục đích tuyển dụng, liên kết chính sách và thời hạn lưu 12 tháng đã có trong chính sách.
- Gửi thành công thay form bằng thẻ xác nhận có mã và hotline; lỗi giữ thông tin/CV, khóa gửi trùng khi đang xử lý. Có cảnh báo khi rời trang, đóng/tải lại và Back/Forward khi trình duyệt cho phép.
- Backend chuẩn hóa SĐT/email và kiểm tra cùng quy tắc với client; transaction MySQL chặn hồ sơ cùng SĐT hoặc email, cùng vị trí trong 24 giờ, kể cả hai request đồng thời. Giữ CAPTCHA và honeypot; quota riêng 5 hồ sơ/IP/giờ, quản lý qua giới hạn tần suất hiện có.
- CV lưu tên UUID tại `server/private/cv`; kiểm tra phần mở rộng, MIME, chữ ký PDF và cấu trúc DOCX/ZIP, từ chối PDF có hành động thực thi, macro, entry ZIP nguy hiểm hoặc dữ liệu giải nén quá lớn. Đây là kiểm tra cấu trúc, chưa tích hợp dịch vụ antivirus. Tệp của request thất bại được dọn; tải cần đăng nhập và quyền quản lý tuyển dụng, kiểm tra realpath, chống traversal, không cache. API danh sách admin không trả `cv_path`.
- Admin có xem trước nội dung chưa đăng, hình thức làm việc trên các trường hiện có, danh sách hồ sơ gắn đúng vị trí và tải CV có đuôi phù hợp. Không thêm trường vào API hay bảng hồ sơ.
- Có canonical, description, JobPosting/BreadcrumbList JSON-LD, ánh xạ cả hình thức cũ tiếng Việt và ảnh chia sẻ thương hiệu 1.200×630. Chỉ đưa mức lương công khai vào schema; tin đóng không còn JobPosting, vẫn xem được, dùng `noindex` sau 30 ngày như đề xuất.

## Kiểm tra

- TypeScript client/server: đạt. ESLint các file frontend thay đổi: không lỗi/cảnh báo.
- 21 unit test frontend đạt, gồm 7 test tuyển dụng và đoạn Yêu cầu/Quyền lợi thực tế của tin “Giao dịch viên cửa hàng Trung tâm”.
- 15 unit test backend đạt cho dữ liệu, consent, upload, giới hạn IP và các kiểm tra an toàn liên quan.
- 11 kiểm thử giao diện đạt: 375/768/1024/1440px, dark mode, consent, lỗi/trạng thái gửi, kéo thả/xóa CV, tin đóng, metadata/ảnh chia sẻ, cảnh báo rời trang và admin/preview/tải CV.
- `server/scripts/verify-recruitment-flow.cjs` chạy controller/service thật trên database MySQL riêng: lưu/link vị trí, gửi đồng thời, cửa sổ 24 giờ, nguồn ứng viên, CV PDF/DOCX, MIME/size giả, consent, dọn tệp lỗi, tải có xác thực và traversal. Database và các CV của kiểm thử được dọn sau khi chạy; không gửi email thật.
- Migration riêng `20261006000002-recruitment-rate-limit.js` đã áp dụng trên DB local cấu hình hiện tại; giữ nguyên cấu hình nếu khóa đã tồn tại. Backup: `server/backups/recruitment-rate-limit-1791292417354.json`. Không chạy các migration đang chờ khác.

Ảnh kiểm tra trong [screenshots](screenshots/): `recruitment-375.png`, `recruitment-768.png`, `recruitment-1024.png`, `recruitment-1440.png`, `recruitment-dark.png`, `recruitment-admin-logo.png`, `recruitment-admin-mobile-logo.png`, `recruitment-og.png`.

## Đang chờ duyệt theo mục 5 của yêu cầu

Hai mẫu `job_application_received_candidate`, `job_application_new_staff` và hai biến `job_title`, `application_code` mới chỉ nằm trong [đề xuất email](RECRUITMENT_UPGRADE_PROPOSAL.md). Chưa thêm vào hệ thống gửi thư, chưa sửa allowlist email hay bật gửi ứng viên/nhân viên.

Cảnh báo Back/Forward dùng Navigation API khi sự kiện có thể hủy; các trường hợp còn lại dùng cảnh báo rời trang của trình duyệt. Khả năng hủy phụ thuộc loại điều hướng và trình duyệt theo [HTML Standard](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-navigate-event).
