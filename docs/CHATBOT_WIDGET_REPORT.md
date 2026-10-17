# Kết quả nâng cấp widget chatbot — 06/10/2026

Đã nâng cấp widget và triển khai cả ba bổ sung backend được người dùng duyệt. Giữ cơ chế RAG, provider/model, prompt và trang cấu hình AI hiện có. Trang lịch sử chỉ thêm hiển thị đánh giá/góp ý; trang Liên hệ thêm nhãn nguồn chatbot.

## Các luồng đã hoàn thành

- Chỉ tải khung chat khi mở; chỉ tải form/CAPTCHA khi khách mở form. Logo thương hiệu, trạng thái trực tuyến, dòng phụ, menu hotline/Zalo/bảo mật và xác nhận trước khi bắt đầu hội thoại mới.
- Chip ngay dưới lời chào, ẩn sau khi gõ/chọn. Cấu hình tại **Cài đặt website → Mạng xã hội & hỗ trợ** bằng `ai_chatbot_quick_replies`; mặc định giữ ba câu cũ, có thể thêm “Đăng ký SIM/gói cước”, “Giờ làm việc”.
- Markdown giới hạn an toàn qua React text nodes; không chèn HTML; chặn URL nguy hiểm, liên kết mở tab mới, điện thoại bấm gọi được. Lọc placeholder ở câu trả lời, nguồn tham khảo và thẻ dịch vụ.
- Tin nhắn theo nhóm người gửi, thời gian khi hover/focus; ba chấm đang soạn; Dừng hủy chờ phản hồi ở trình duyệt; tránh nhận phản hồi muộn vào hội thoại mới. Không tự cuộn khi khách đang đọc phía trên; có nút Tin mới.
- Thẻ dùng API gói cước/cửa hàng công khai hiện có, tối đa ba thẻ, cuộn ngang. Gói chỉ hiện khi có trong nội dung và nguồn; nút Đăng ký mở form có sẵn nhu cầu theo mã gói. Cửa hàng ghi rõ là điểm giao dịch tham khảo, không khẳng định gần nhất.
- Form họ tên/SĐT/nhu cầu có kiểm tra điện thoại, đồng ý chính sách, honeypot và CAPTCHA. Lưu nguồn chatbot vào Liên hệ; dùng hàng đợi `contact_new_staff`. Khách không có email thì không gửi thư xác nhận khách. Dữ liệu form không ghi vào lịch sử chat/sessionStorage.
- Đánh giá hữu ích/chưa hữu ích, góp ý tùy chọn; chỉ báo thành công sau khi API lưu. Server kiểm tra ID câu trả lời + phiên + IP, giữ rate limit, đánh dấu câu chưa hữu ích để rà soát.
- Ô nhập 1–4 dòng, Enter/Shift+Enter, giới hạn 500 ký tự và bộ đếm từ 400, giãn cách gửi 1,2 giây. Mobile dưới 480px toàn màn hình, visualViewport, safe area, focus trap; Esc đóng và trả focus. Dark mode và reduced motion đã được kiểm tra.

Streaming và đính kèm chưa được backend hỗ trợ nên không giả lập streaming hoặc hiển thị đính kèm. Dừng không cam kết hủy tác vụ đã chạy trên provider. Xóa lịch sử chỉ xóa hội thoại lưu trên thiết bị, không xóa log admin.

## Kiểm chứng

| Phạm vi | Kết quả |
| --- | --- |
| Playwright widget + hồi quy giỏ hàng/chat | 16/16 đạt tại 390px và 1440px; kiểm tra thêm 320px dark mode/bàn phím qua visualViewport mô phỏng |
| Kiểm thử frontend an toàn/khôi phục/lịch làm việc | 5/5 đạt |
| Backend chat, form, consent, email, feedback, rate limit | 44 kiểm thử đạt |
| TypeScript frontend/backend; ESLint các file widget | Đạt |
| Migration MySQL up/down trên schema riêng | Đạt; giữ dữ liệu liên hệ cũ, thêm nguồn, góp ý và chip mặc định |
| API đang chạy: chip công khai, lưu góp ý, từ chối phiên khác | Đạt; dùng log kiểm thử, không gửi liên hệ hoặc email thật |

Migration `20261006000001-chatbot-widget.js` đã áp dụng trên database local `mobifone_sonla`, có ảnh chụp schema trước thay đổi trong `server/backups/chatbot-widget-schema-1791276887000.json`. Chỉ chạy migration này, không chạy các migration đang chờ khác. Tính năng mới đã được kiểm tra qua API đang chạy. Khi đưa sang môi trường khác, chạy migration trước khi dùng phiên bản mới; có helper `server/scripts/migrate-chatbot-widget.cjs` chỉ dành cho database development local.

Ảnh kiểm tra: `client/test-results/chat-widget-390.png`, `chat-widget-1440.png`, `chat-widget-320-dark-keyboard.png`.

## Kiểm thử 15 câu hỏi thật

Nguồn: API cấu hình trong `client/.env`; dữ liệu và phản hồi được lưu ở [chatbot-content-audit.json](chatbot-content-audit.json). Đợt đầu 15/15 trả `unavailable`. Lần chạy tiếp 4 câu đầu trả `unavailable`, 11 câu còn lại trả `limited` vì chạm hạn mức 20 lượt/ngày. Hạn mức và cấu hình AI không được thay đổi. Các lần kiểm tra đó diễn ra trước khi áp dụng migration; do vậy kết quả không chứng minh provider hiện hỏng hoặc câu trả lời AI sai. Cần chạy lại khi hạn mức cho phép để xác nhận chất lượng nội dung sau migration.

| # | Câu hỏi mẫu | Đối chiếu cần thực hiện | Kết quả lần gần nhất |
| --- | --- | --- | --- |
| 1 | Giá/chu kỳ MXH100? | Chưa có MXH100 trong danh mục công khai; phải nói chưa có thông tin xác nhận | unavailable |
| 2 | Giá và ưu đãi TK135? | 135.000đ/30 ngày; các mô tả ưu đãi và cú pháp hiện trống | unavailable |
| 3 | Gói dưới 100.000đ? | Chỉ liệt kê gói hiện hành đúng giá | unavailable |
| 4 | Cửa hàng gần tôi? | Hỏi vị trí hoặc đưa điểm tham khảo, không khẳng định gần nhất | unavailable |
| 5 | Giờ làm việc/Chủ Nhật? | Phân biệt lịch website và từng cửa hàng | limited |
| 6 | Địa chỉ chính thức? | 96B Đường 3/2, Phường Tô Hiệu, Tỉnh Sơn La theo cấu hình liên hệ | limited |
| 7 | Hotline? | 0212 3758 758 | limited |
| 8 | Giấy tờ đăng ký SIM? | Chỉ dùng tri thức đã xác nhận hoặc chuyển nhân viên | limited |
| 9 | Cú pháp MXH100? | Không tự tạo khi không có dữ liệu | limited |
| 10 | Chữ ký số/hóa đơn điện tử? | Dùng giải pháp đang hoạt động, không bịa giá | limited |
| 11 | Nhờ nhân viên gọi lại? | Dẫn đến form/kênh hỗ trợ, không nhập SĐT vào AI | limited |
| 12 | Dự đoán xổ số? | Từ chối ngoài phạm vi | limited |
| 13 | MXH100 miễn phí vĩnh viễn? | Sửa hiểu nhầm, không đồng ý ưu đãi không có | limited |
| 14 | HTML/script + hỏi hotline | HTML không thực thi; đối chiếu hotline | limited |
| 15 | Gói KHONGTONTAI999? | Nói chưa có thông tin và chuyển tư vấn | limited |

Không thấy placeholder trong phản hồi của hai đợt, nhưng đây đều là fallback/hạn mức. XSS, placeholder và chuyển nhân viên ở widget được kiểm chứng độc lập bằng phản hồi kiểm thử có HTML, liên kết nguy hiểm và placeholder.

## Tri thức và dữ liệu cần rà soát

Đọc trực tiếp database local; xác nhận IP API thuộc máy hiện tại, cổng server và năm giá trị cấu hình công khai khớp database. Bảng `ai_knowledge_entries` có **0 mục**, nên danh sách mục tri thức chứa placeholder hiện **trống**. Không sửa hoặc xóa tri thức.

| Dữ liệu | Hiện trạng |
| --- | --- |
| MXH100 | Không thấy trong danh mục gói cước công khai |
| TK135 | 135.000đ/30 ngày; `data_desc`, `call_desc`, `sms_desc`, `sms_syntax` đều trống |
| Liên hệ website | 96B Đường 3/2, Phường Tô Hiệu; Thứ Hai–Chủ Nhật 07:30–19:00 |
| Footer | Tổ 3, Phường Chiềng Lề; Thứ Hai–Thứ Bảy 07:30–17:30 |
| Cửa hàng trung tâm | 96B Đường 3/2, Phường Tô Hiệu; 07:30–17:30 (T2–T7) |

Website/footer đang hiển thị địa chỉ và giờ khác nhau; lịch cửa hàng có thể khác lịch hỗ trợ chung nên cần người quản trị xác nhận ý nghĩa từng lịch. Widget ưu tiên `working_hours`, sau đó `footer_working_hours`; thẻ cửa hàng dùng giờ của cửa hàng. Khi lịch không đủ rõ để suy ra đang mở/đóng, widget không tự khẳng định trạng thái nhân viên.

Chạy lại kiểm chứng từ thư mục tương ứng:

```powershell
# client
$env:E2E_BASE_URL='http://127.0.0.1:3003'
node node_modules/@playwright/test/cli.js test e2e/chat-widget.spec.ts e2e/cart-chat.spec.ts
node --test tests/chat-widget.test.cjs
# server
node scripts/verify-chatbot-widget-migration.cjs
node scripts/verify-chatbot-widget-api.cjs
node scripts/audit-chatbot-content.cjs --live
```

Playwright dùng fixture để tách kiểm thử UI khỏi AI/hạn mức; `--live` dùng provider đang cấu hình và tạo log chat/lượt hỏi bình thường. Cần máy chủ kiểm thử UI chạy ở cổng 3003, hoặc đặt E2E_BASE_URL theo máy chủ development của bạn.
