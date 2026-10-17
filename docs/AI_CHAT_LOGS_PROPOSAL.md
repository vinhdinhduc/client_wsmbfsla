# Đề xuất nâng cấp Lịch sử hội thoại AI — cần duyệt backend

Ngày: 06/10/2026. Yêu cầu gốc quy định: “Thêm trường/bảng/endpoint mới chỉ khi cần và liệt kê trước để tôi duyệt” và “KHÔNG tự thay đổi dữ liệu hoặc cấu hình khi chưa được tôi đồng ý”.

## Chẩn đoán trước khi sửa

Kết quả SELECT và chạy trực tiếp `buildChatContext` được lưu tại `ai-chat-logs-diagnosis.json`; script `server/scripts/diagnose-chatbot-rag.cjs` chỉ đọc database, không gọi model, không tạo log hay tiêu hao quota.

- Tri thức: 0 mục / 0 đang dùng / 0 tạm tắt. Không có bản ghi placeholder vì danh sách trống. Không xác nhận được lịch sử thao tác import, nhưng 72 dòng không tồn tại trong database đang kiểm tra.
- Gói: 2 đang hoạt động. Gói tên MXH100/slug mxh100 có mã **XMH100**, khác câu hỏi; TK135 135.000đ/30 ngày thiếu mô tả ưu đãi, điều kiện và cú pháp. Không có gói dưới 100.000đ.
- Cửa hàng: 4 đang hoạt động. RAG đọc trực tiếp Gói cước, Cửa hàng, Giải pháp, Tin tức, SIM và tri thức. Code chỉ thay hotline nếu prompt có `{{hotline}}`; prompt đang lưu không có token này nên cả hotline/địa chỉ/giờ website chưa được đưa vào context hoặc prompt hiện tại.
- Retrieval dùng SQL LIKE theo từ khóa bỏ dấu; tối đa 5 mục/nguồn, context tối đa 24.000 ký tự. Không có embedding, điểm tương đồng hay ngưỡng để hạ. Năm truy vấn nội bộ đều trả đoạn dữ liệu; điểm được ghi `null` (không áp dụng).
- Câu trả lời dự phòng xuất hiện khi exception trong resolve model/retrieval/gọi model/lưu log hoặc model trả rỗng. Context rỗng vẫn được gửi cho model, không trực tiếp kích hoạt fallback. `flagged_for_review` còn dùng cho phản hồi 👎 và câu bị chặn, nên không thể dùng cờ này để tính số câu chưa trả lời.
- Snapshot ngày 06/10: 28 log / 10 phiên / 23 fallback; 20/20 log ngày này là fallback, một nhóm IP đạt hạn 20; không có provider call ngày này trước phép thử bổ sung. Migration feedback đã áp dụng, full model history SELECT và resolveProvider thành công; lỗi thiếu cột trước migration phù hợp với báo cáo lần kiểm tra trước, nhưng không có mã exception để chứng minh mọi fallback lịch sử. Log cũ không lưu lý do fallback và không liên kết request provider. Không tự reset quota hoặc dùng phiên/IP khác để né hạn mức.
- Phép thử quản trị bổ sung: **5/5 nhận phản hồi Gemini/gemini-2.5-flash, 0 lỗi provider**; ghi 5 usage records bình thường và không tạo chat log (trước/sau đều 28). Khóa/model hiện hoạt động, không cần thay. Kết quả tại `ai-chat-logs-provider-probe.json`; không dùng kết quả này để khẳng định mọi câu hỏi đã được trả lời đầy đủ khi dữ liệu thiếu.

## Gói A: backend quản lý log và ghi chẩn đoán (đề nghị duyệt)

Không thêm bảng; giữ nguyên request/response API chat và phản hồi công khai. Không thay provider/model/prompt/quota/RAG hay dữ liệu kinh doanh.

### Trường thêm vào `ai_chat_logs`

| Trường | Mục đích |
|---|---|
| `review_status` | `new`, `needs_knowledge`, `resolved`, `ignored`; thay cờ đánh dấu một chiều |
| `internal_note` | Ghi chú nội bộ, tối đa 2.000 ký tự |
| `knowledge_entry_id` | Liên kết tri thức đã bổ sung; nullable, xóa tri thức thì bỏ liên kết |
| `question_key` | SHA-256 câu hỏi chuẩn hóa chữ thường/bỏ dấu/dấu câu; gom và sắp xếp tần suất mà không đưa nội dung vào khóa |
| `diagnostics` | JSON: trạng thái trả lời, RAG bật/tắt, số đoạn thực đưa vào context, loại/id/tiêu đề nguồn, điểm cao nhất `null` với tìm từ khóa, mã lý do fallback. Không lưu prompt/API key/raw error |
| `deleted_at` | Xóa mềm, giữ 7 ngày; log đã xóa vẫn tính vào quota ngày để thao tác quản trị không vô tình reset hạn mức |
| `delete_batch_id` | UUID cho một lần xóa, hỗ trợ hoàn tác trong 7 ngày |

Migration thêm chỉ mục thời gian, phiên, trạng thái và khóa câu hỏi; backfill khóa/trạng thái của log cũ. Không bịa chẩn đoán cho log cũ; hiển thị “Log cũ chưa lưu chẩn đoán”. Sao lưu schema/metadata trước áp dụng local.

### API quản trị thêm/mở rộng

Tất cả yêu cầu JWT và role `admin`; response không trả IP, thông tin thiết bị, token/cost hay trường bí mật không phục vụ trang.

Mã phiên có SĐT/email phải dùng định danh opaque ổn định trong response, sao chép và xuất tệp. API theo phiên/chọn phiên sẽ nhận cùng định danh và đối chiếu ở server; không gửi mã gốc chứa PII về trình duyệt hoặc Nhật ký. Trường hợp UUID/mã phiên thông thường giữ nguyên.

- Mở rộng `GET /admin/ai-chat-logs`: phân trang bắt buộc (10/20/50/100), mode `conversations|messages`, tìm không dấu, thời gian Việt Nam, trạng thái, phản hồi, chưa trả lời, tab, sắp xếp; trả `{items,total,page,page_size,mode,tab_counts,snapshot_max_id}`. Nội dung che SĐT/email ngay tại server.
- `GET /admin/ai-chat-logs/summary`: thống kê, xu hướng 7 ngày và nhóm câu chưa trả lời (danh sách nhóm có giới hạn).
- `GET /admin/ai-chat-logs/sessions/:session_id`: hội thoại theo trang tối đa 100 tin, thứ tự cũ đến mới; drawer tải tiếp để xem toàn bộ.
- Mở rộng `PUT /admin/ai-chat-logs/:id`: trạng thái/ghi chú; không cho quản trị giả phản hồi khách.
- `POST /admin/ai-chat-logs/:id/reveal`: trả nội dung đầy đủ sau khi ghi Nhật ký thành công, không lưu PII vào Nhật ký.
- `DELETE /admin/ai-chat-logs/:id`, `DELETE /admin/ai-chat-logs/sessions/:session_id`: xóa mềm và Nhật ký trong cùng transaction.
- `POST /admin/ai-chat-logs/bulk`: chọn id/phiên hoặc tất cả kết quả lọc trong snapshot; xem trước số lượng, xử lý, xóa. Preview trả `requires_confirmation` khi điều kiện/chọn id/phiên bao phủ toàn bộ lịch sử chưa xóa; server bắt buộc `XOA` cho các trường hợp này, kể cả chọn tất cả kết quả không có bộ lọc. Có kiểm tra lại số lượng trước xóa.
- `POST /admin/ai-chat-logs/restore`: hoàn tác theo batch trong 7 ngày, có Nhật ký.
- `POST /admin/ai-chat-logs/export`: CSV UTF-8 BOM hoặc Excel theo lọc/chọn; che PII và chặn ô công thức, ghi Nhật ký xuất.
- Mở rộng body `POST /admin/ai-knowledge` với `source_log_ids` hoặc `source_question_key`: tạo tri thức, liên kết và chuyển log nguồn sang Đã xử lý trong cùng transaction. Không tự tạo nội dung trả lời.

### Lưu trữ tự động

Thêm khóa settings `ai_log_retention_days`, đọc/lưu qua `/admin/ai-settings` hiện có; 0 = tắt, gợi ý 90 ngày trên giao diện. Khởi tạo **0** để migration không tự xóa lịch sử. Job hàng ngày xóa mềm log quá thời hạn đã được admin bật và xóa vĩnh viễn log đã nằm trong thùng rác quá 7 ngày, theo batch có Nhật ký và khóa tránh chạy trùng. Không ghi IP đầy đủ vào Nhật ký mới của trang.

## Gói B: sửa chất lượng câu trả lời — duyệt riêng

1. Sửa dữ liệu mã gói XMH100 thành MXH100 sau khi xác nhận mã chuẩn; không sửa giá/chu kỳ.
2. Import/lưu 72 dòng sau khi người quản trị rà soát, đặt mục còn `[ĐIỀN: ...]`/`[XÁC NHẬN: ...]` ở Tạm tắt; bổ sung TK135 từ nguồn chính thức đã xác nhận.
3. Chặn retrieval dùng mục tri thức chứa placeholder ở server, kể cả đã để Đang dùng. Không sửa nội dung hoặc trạng thái bản ghi.
4. Bổ sung địa chỉ/giờ website vào RAG chỉ sau khi thống nhất cấu hình contact và footer đang không khớp.

Gói A không mặc nhiên duyệt Gói B. Không hạ ngưỡng vì thuật toán hiện không có ngưỡng tương đồng. Không đổi model/key/hạn mức để che lỗi.

## Kế hoạch giao diện và kiểm tra

Mặc định nhóm phiên, drawer bong bóng; lọc nhớ URL, tab đếm, thống kê và danh sách việc ưu tiên. Trạng thái/ghi chú/tri thức, chọn nhiều/preview/xóa/hoàn tác/xuất, chính sách lưu trữ. Loading/rỗng/lỗi/toast, J/K/Esc/focus, 375px và dark mode. Chạy dữ liệu giả 10.000 log trong database riêng, phiên 1/50 tin, quyền/audit transaction/retention/CSV injection/HTML escape và lint/build; không xóa log thật hoặc gửi email thật khi kiểm thử.
