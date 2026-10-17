# Bổ sung nhỏ cần duyệt cho widget chatbot

Phần giao diện được triển khai độc lập. Không thay đổi RAG, provider, model, prompt hoặc trang admin AI Chatbot.

1. **Chip do admin cấu hình:** thêm khóa công khai `ai_chatbot_quick_replies` (mảng JSON tối đa 8 câu, mỗi câu tối đa 100 ký tự), một ô cấu hình tại **Cài đặt website**, giữ ba câu hiện có làm mặc định. Không sửa trang admin AI Chatbot.
2. **Liên hệ từ chatbot:** mở rộng `POST /public/contacts` bằng trường `source: 'chatbot' | 'website'`, lưu `source` vào bảng contacts; email được bỏ trống khi nguồn là chatbot. Giữ consent, CAPTCHA, honeypot, rate limit và hàng đợi email `contact_new_staff`; chỉ gửi email xác nhận khách khi có email. Form chatbot gồm họ tên, điện thoại, nhu cầu và đồng ý chính sách.
3. **Phản hồi câu trả lời:** trả thêm `answer_id` (ID log vừa lưu) trong kết quả chat; thêm `POST /public/chat/feedback` nhận `session_id`, `answer_id`, `was_helpful`, `comment` tùy chọn (tối đa 500 ký tự). Chỉ cập nhật log khớp phiên và IP; áp dụng rate limit. Tái sử dụng `was_helpful` và `flagged_for_review`; thêm cột `feedback_comment` cho góp ý. Trang lịch sử hiện có đọc phản hồi qua log; không thay đổi cấu hình AI.

Không cần endpoint rich cards: widget lấy dữ liệu có cấu trúc từ API công khai của gói cước/cửa hàng được dẫn nguồn trong câu trả lời. Thẻ cửa hàng là các điểm giao dịch tham khảo, không khẳng định gần người dùng nhất khi chưa biết vị trí.

Không triển khai streaming hoặc đính kèm: endpoint chat hiện trả JSON hoàn chỉnh và không nhận file. Nút Dừng hủy chờ phản hồi ở trình duyệt; không cam kết hủy tác vụ provider trên máy chủ.

Người dùng đã duyệt cả ba bổ sung trong cuộc trao đổi ngày 06/10/2026. Các bổ sung đã được triển khai trong source, kèm migration `20261006000001-chatbot-widget.js`. Góp ý chỉ báo thành công sau khi API xác nhận lưu.
