# Nâng cấp Lịch sử hội thoại AI — 06–07/10/2026

## Kết quả đang hoạt động với API hiện có

- Trang `/admin/ai-chat-logs` mặc định nhóm theo phiên, chuyển được sang từng tin nhắn. Drawer bong bóng Khách/AI, thời gian Việt Nam, sao chép phiên, nội dung dài thu gọn, J/K chuyển dòng và Esc đóng drawer.
- Tìm không dấu, lọc trạng thái/thời gian/phản hồi/chưa trả lời, tab đếm, sắp xếp và nhảy trang 10/20/50/100; lựa chọn lưu trong URL. **API cũ chỉ trả tối đa 100 tin gần nhất**, vì vậy các bộ lọc/phân trang/nhóm đang áp dụng trong 100 tin này; trang ghi rõ phạm vi, không trình bày như phân trang toàn database.
- Nhãn Cần bổ sung tri thức thay nút đỏ Đã đánh dấu; thao tác này vẫn lưu bằng PUT/cờ hiện có. Không suy ra “chưa trả lời được” từ cờ flagged vì cờ còn dùng cho phản hồi 👎/câu bị chặn. Nhận diện câu dự phòng và lời từ chối vì thiếu dữ liệu; câu TK135 đã trả giá nhưng thiếu ưu đãi không bị gắn nhầm fallback chung.
- Che SĐT/email ở giao diện và **response của hai API quản trị hiện có** GET danh sách/PUT đánh dấu, kể cả Unicode separators. Mã phiên chứa SĐT/email được thay bằng `private-` + 24 ký tự SHA-256 ổn định của mã gốc; các phiên có giá trị khác nhau vẫn thuộc nhóm riêng, UUID/mã thông thường giữ nguyên. UI rút 8 ký tự của phần hash để phân biệt các phiên này. DTO chỉ trả field phục vụ trang, loại IP/consent/device/token/cost và field ngoài whitelist. Response `Cache-Control: no-store`. IP vẫn nằm trong database vì luồng công khai hiện dùng cho hạn mức/feedback; không đổi dữ liệu lưu hoặc luồng này.
- Thêm vào Dữ liệu tri thức mở form có tiêu đề câu hỏi đã che PII, nội dung trống để admin nhập thông tin đã xác nhận; có thể mở mục tri thức theo ID. Không tự thêm tri thức hoặc sửa dữ liệu gói cước.
- Loading skeleton, tải lỗi/thử lại, rỗng/lọc rỗng/reset, toast, focus và 375px/dark mode. Provider/model/độ trễ đã lưu được hiển thị ngay cả log cũ; các chẩn đoán chưa lưu được ghi rõ, không tạo điểm tương đồng giả.

## Phần giao diện đã chuẩn bị, backend còn chờ duyệt

[AI_CHAT_LOGS_PROPOSAL.md](AI_CHAT_LOGS_PROPOSAL.md) liệt kê 7 cột, settings key và các endpoint mới theo quy tắc trong yêu cầu gốc. Chưa có câu trả lời duyệt Gói A hoặc việc chặn placeholder ở thời điểm lập báo cáo.

UI/client contract đã chuẩn bị cho phân trang toàn database, thống kê/sparkline/FAQ, trạng thái đầy đủ/ghi chú, tạo tri thức và liên kết nguồn trong transaction, chọn nhiều/tất cả snapshot, xem trước số lượng/xóa mềm 7 ngày/hoàn tác/XOA, CSV/Excel và hiện PII qua API có audit. Xóa toàn bộ qua dọn dẹp hoặc chọn tất cả kết quả không lọc đều yêu cầu đúng `XOA`; preview có thể yêu cầu thêm xác nhận khi tập ID/phiên/điều kiện bao phủ toàn bộ lịch sử. Chế độ nâng cao chỉ bật khi API trả hợp đồng phân trang mới; **API hiện tại trả array nên UI không gọi các endpoint mới, không cho xóa/xuất/reveal và không hứa lưu trạng thái chưa có**.

Form tri thức kiểm tra khả năng liên kết nguồn bằng GET log hiện có. Khóa Lưu khi kiểm tra đang chạy/lỗi để tránh mất liên kết âm thầm; với API cũ chỉ tạo tri thức theo body cũ. Ô retention chỉ hiện khi API settings hỗ trợ trường tương ứng, không tự chèn giá trị 0/90 vào cấu hình hiện tại.

**Chưa triển khai** migration, endpoint quản lý mới, job retention, audit reveal/delete/export, liên kết nguồn server hoặc chặn placeholder. Vì vậy kiểm thử các giao diện nâng cao với API giả không thay thế kiểm thử MySQL, quyền/audit transaction hoặc chính sách tự xóa thực tế. Không xóa log thật, không áp dụng schema và không kích hoạt chính sách lưu trữ ở nhiệm vụ này.

## Chẩn đoán bot

[AI_CHAT_LOGS_DIAGNOSIS.md](AI_CHAT_LOGS_DIAGNOSIS.md) và [JSON retrieval](ai-chat-logs-diagnosis.json) ghi kết quả thật trước khi sửa.

- Tri thức 0/0 đang dùng; 72 dòng không tồn tại trong database kiểm tra. Chưa có audit để kết luận lịch sử import/xóa ở môi trường khác.
- Có 2 gói/4 cửa hàng active; tên MXH100 nhưng code **XMH100** khiến exact-code retrieval bỏ sót; TK135 135.000đ/30 ngày còn thiếu ưu đãi/cú pháp. Không có gói dưới 100.000đ.
- Tìm SQL LIKE, tối đa 5 mục mỗi nguồn; không embedding/score/threshold. Năm câu lấy 8/9/8/11/8 đoạn, không tự sinh điểm. Địa chỉ/giờ website chưa có trong context; prompt đang lưu không có token hotline.
- Snapshot ngày 06/10: 28 tin/10 phiên/23 fallback; 20/20 tin trong ngày fallback, một nhóm IP chạm 20 lượt/ngày. Thiếu cột trước migration widget phù hợp với lỗi lịch sử đọc log; không có fallback reason để khẳng định mọi exception cũ. Migration hiện đã có, đọc model và resolve profile thành công.
- [Phép thử model quản trị](ai-chat-logs-provider-probe.json): **5/5 nhận phản hồi, 0 lỗi provider**, đúng Gemini/gemini-2.5-flash và prompt/params đang lưu. TK135 đúng giá/chu kỳ, không bịa ưu đãi; MXH100 vẫn thiếu context vì mã sai. Số chat log trước/sau đều 28; 5 usage records được ghi theo luồng kiểm thử hiện có. Không reset quota/đổi IP/phiên hoặc tăng hạn mức. Quota 06/10 không phải kết luận cho 07/10.

Không thay mã XMH100, nội dung TK135, 72 dòng tri thức, provider/model/key/prompt/RAG hoặc cấu hình website. Việc chặn placeholder đang được xin duyệt riêng; sửa dữ liệu cần xác nhận nguồn chuẩn.

## Kiểm tra

- Frontend unit: 26 bài đạt trong lượt đầy đủ; 5 bài helper được chạy lại sau sửa Unicode/nhận diện phản hồi thiếu dữ liệu.
- UI: **14/14 bài đạt trong lượt cuối** (50,4 giây). Fixture 10.000 tin/9.951 phiên, phiên 1 và 50 tin; HTML/script escape, mask/reveal/ghi chú chứa PII, trạng thái/ghi chú, FAQ/prefill/capability race, chọn nhiều/export/xóa/XOA/undo (cả dọn dẹp và chọn toàn bộ kết quả không lọc), rỗng/lỗi, J/K/Esc, URL Infinity và API cũ. Đã sửa thời gian chờ URL riêng của bài FAQ thành 30 giây sau khi lượt cold compile trang tri thức mất 10,3 giây vượt mức chờ 10 giây. Các luồng quản lý mới được mock, không phải API thật. Không phát hiện lỗi console trong các kiểm tra responsive; CSS xác nhận thanh hành động chỉ sticky khi chọn.
- Backend privacy: **7/7 Jest bài đạt**, gồm 5 utility/DTO và 2 controller response thực với ORM mock; xác nhận nội dung lưu không bị sửa, raw PII/metadata không ra JSON, mã phiên chứa contact được thay ổn định và không gộp nhầm. TypeScript server và targeted ESLint controller/utility đạt.
- TypeScript frontend và ESLint các file thay đổi đạt. **Production build cuối đạt (exit 0)** trong `.next-ui-build-1791335789485`: biên dịch 52 giây, tạo 53/53 trang và đóng gói standalone thành công. Còn 6 cảnh báo `<img>` có sẵn ở trang Sliders, Tiện ích và ContentImage ngoài phạm vi sửa; không có lỗi lint/build. `tsconfig.json`/`next-env.d.ts` được khôi phục đúng nội dung trước kiểm tra; server fixture đã dừng, cổng 3003/4003 được giải phóng.

Ảnh kiểm tra: [375px](screenshots/ai-chat-logs-375.png), [dark 1440px](screenshots/ai-chat-logs-1440-dark.png), [API cũ/100 tin](screenshots/ai-chat-logs-legacy-100.png). Thanh thao tác nằm trong luồng trang khi chưa chọn, chỉ sticky sau chọn để tránh che bộ lọc trên mobile.

Lệnh tái hiện: `node --test tests/ai-chat-log-presentation.test.cjs`; `E2E_BASE_URL=http://127.0.0.1:3003` với `node node_modules/@playwright/test/cli.js test e2e/ai-chat-logs.spec.ts`; `node scripts/verify-ui-build.cjs` chạy production build trong `.next-ui-build-*` và khôi phục tsconfig/next-env sau kiểm tra.

## Phạm vi file

Trang/style lịch sử; helper trình bày và unit test; client API contract; form tri thức và retention UI có guard; E2E fixtures; hai response controller AI và utility privacy. Script chẩn đoán/probe/report chỉ phục vụ kiểm tra. Các thay đổi có sẵn từ nhiệm vụ widget, tuyển dụng, sidebar và phần người dùng đang sửa được giữ lại.
