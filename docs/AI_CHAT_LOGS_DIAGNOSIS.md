# Chẩn đoán chatbot trước khi nâng cấp lịch sử hội thoại

Kiểm tra ngày 06/10/2026 trên database local đang cấu hình cho server. **Đợt đọc dữ liệu ban đầu** chỉ chạy truy vấn đọc, kiểm tra giải mã khóa trong bộ nhớ, gọi `resolveProvider()` và hàm lấy context `buildChatContext()`; không gọi AI, không gọi API chat công khai, không ghi log mới, không thay dữ liệu/cấu hình hay đặt lại hạn mức. **Phép thử model bổ sung** bên dưới gọi đúng 5 câu theo luồng quản trị hiện có, ghi usage provider bình thường và không tạo log hội thoại. Không xuất khóa, IP, thông tin thiết bị hoặc nội dung khách; số điện thoại/email trong đoạn context/phản hồi được che.

Bằng chứng có thể chạy lại: [diagnose-chatbot-rag.cjs](../../server/scripts/diagnose-chatbot-rag.cjs). Kết quả đầy đủ, gồm từng đoạn tri thức lấy được: [ai-chat-logs-diagnosis.json](ai-chat-logs-diagnosis.json).

## Dữ liệu đang lưu

| Nguồn | Kết quả thật |
| --- | --- |
| Dữ liệu tri thức | **0 mục**, **0 Đang dùng**, **0 Tạm tắt** |
| Tri thức chứa `[ĐIỀN: ...]` / `[XÁC NHẬN: ...]` | **0 mục**, danh sách trống |
| Gói cước đang hoạt động | **2** |
| Cửa hàng đang hoạt động | **4** |
| Gói hiện hành dưới 100.000đ | **0** |
| Log hội thoại | **28 tin**, **10 phiên**, **23 câu trả lời dự phòng** |

Không có 72 dòng tri thức trong database hiện tại. Màn hình xem trước import lưu trong state trình duyệt; việc đọc file/xem 72 dòng chưa gửi dữ liệu lên server. Chỉ thao tác xác nhận nhập mới gọi `createKnowledge()` cho các dòng đã chọn. Không đủ nhật ký để xác nhận 72 dòng chưa từng được lưu, đã bị xóa, hay thuộc môi trường khác; kết luận chắc chắn là **hiện chưa có 72 dòng đó để bot dùng**. API thêm/sửa/xóa tri thức hiện không gắn middleware ghi Nhật ký hệ thống.

| Tên gói | Mã đang lưu | Giá / chu kỳ | Dữ liệu còn thiếu |
| --- | --- | --- | --- |
| MXH100 | **XMH100** | 100.000đ / 30 ngày | Data, gọi, SMS, điều kiện, cú pháp đều trống |
| TK135 | TK135 | 135.000đ / 30 ngày | Data, gọi, SMS, điều kiện, cú pháp đều trống |

Mã `XMH100` bị đảo ký tự so với tên `MXH100` và slug `mxh100`. Khi câu hỏi chứa `MXH100`, pipeline chọn exact match theo `code` và bỏ qua gói này. Không tự sửa mã vì đây là thay đổi dữ liệu cần người quản trị xác nhận.

Thông tin liên hệ website đang là `96B Đường 3/2, Phường Tô Hiệu, Tỉnh Sơn La`, giờ `Thứ Hai–Chủ Nhật: 07:30–19:00`. Footer lại là `Tổ 3, Phường Chiềng Lề`, giờ `Thứ Hai–Thứ Bảy: 07:30–17:30`. Cửa hàng trung tâm có giờ `7:30–17:30 (T2–T7)`. Cần xác nhận đây là lịch hỗ trợ chung hay lịch giao dịch riêng trước khi đồng bộ.

## Pipeline hiện tại

Bot lấy trực tiếp **6 nguồn**: tri thức đang dùng, giải pháp đang hoạt động, gói cước đang hiệu lực, cửa hàng đang hoạt động, tin đã xuất bản, SIM đang có. Vì vậy bảng tri thức trống không đồng nghĩa bot không có bất kỳ dữ liệu nào.

- Tìm kiếm bằng **SQL `LIKE`**, nối `OR` giữa các từ khóa/field; câu hỏi được viết thường, bỏ dấu và bỏ một số từ dừng. Tối đa 12 từ khóa.
- **Không có embedding, điểm tương đồng hay ngưỡng điểm**. Điểm trong báo cáo là `null`, không tạo điểm giả; “hạ ngưỡng” không áp dụng cho code hiện tại.
- Tối đa **5 bản ghi mỗi nguồn**, tức tối đa 30 đoạn; context giới hạn 24.000 ký tự. Tri thức sắp xếp theo thời gian sửa mới nhất, gói theo giá tăng dần. Không có xếp hạng độ liên quan.
- Câu hỏi `gói cước/gói data/4G/5G` lấy danh sách gói chung. Nếu nhận ra mã gói, pipeline chuyển sang tìm đúng `code`. Câu hỏi cửa hàng lấy tối đa 5 cửa hàng; không tính cửa hàng gần nhất vì chưa có vị trí khách.
- Từ phổ biến như `gói`, `giá`, `bao` vẫn có thể kéo nhiều giải pháp/tin không liên quan vào context; số đoạn lấy được không phản ánh chất lượng liên quan.
- Địa chỉ và giờ làm việc trong settings website **không được thêm vào context**. Code chỉ thay `{{hotline}}` trong prompt nếu tồn tại; prompt đang lưu **không có token đó**, nên hotline cũng chưa được truyền vào prompt thực tế.
- Prompt đang dùng: “Bạn là trợ lý ảo của MobiFone Chi nhánh Sơn La. Hãy trả lời ngắn gọn, lịch sự và chỉ dựa trên dữ liệu được cung cấp.” Prompt mặc định trong code có nhiều quy tắc hơn nhưng bị giá trị này thay thế.

Câu trả lời dự phòng chỉ kích hoạt khi **có exception** trong đọc lịch sử/resolve provider/retrieval/gọi AI/ghi log, hoặc AI trả nội dung rỗng. Context không có dữ liệu chỉ trở thành chuỗi “Không tìm thấy dữ liệu liên quan trong hệ thống.” và vẫn được gửi tới provider; không tự kích hoạt fallback. Vì vậy không thể kết luận 5/5 fallback là do thiếu tri thức.

## Thử lấy context cho 5 câu hỏi

Đã gọi hàm retrieval nội bộ thật, độc lập, không kèm lịch sử và không gọi AI:

| Câu hỏi | Đoạn lấy được | Nội dung liên quan |
| --- | ---: | --- |
| Gói MXH100 giá bao nhiêu? | 8 | **0 gói**, chỉ 5 giải pháp + 3 tin; gói bị bỏ do mã `XMH100` |
| Gói TK135 giá bao nhiêu? Có ưu đãi gì? | 9 | 1 đoạn TK135 đúng giá/chu kỳ + 5 giải pháp + 3 tin; chưa có ưu đãi để trả lời |
| Gói cước nào rẻ dưới 100.000đ? | 8 | 2 gói 100.000đ và 135.000đ + 5 giải pháp + 1 tin; **không gói nào dưới mức hỏi** |
| Cửa hàng gần tôi ở đâu? | 11 | 4 cửa hàng + 5 giải pháp + 2 tin; cần hỏi vị trí để tư vấn gần nhất |
| Gói cước nào rẻ? | 8 | 2 gói theo giá tăng dần + 5 giải pháp + 1 tin |

Mọi điểm tương đồng đều **không có / `null`**. File JSON chứa toàn bộ đoạn và nguồn, bao gồm đoạn TK135: `135000 VNĐ/30 ngay`, điều kiện/cú pháp “Chưa có thông tin”.

## Phân biệt lỗi lịch sử với trạng thái hiện tại

Ảnh chụp dữ liệu **trước phép thử model bổ sung** cho thấy ngày 06/10 có **20 log, 20 fallback**; bảng `ai_provider_calls` **chưa có lượt gọi provider ngày này**. Trong 30 ngày chỉ thấy một call Gemini `gemini-2.5-flash` thành công ngày 02/10, 4.086ms, không có mã lỗi provider. Log cũ chưa lưu lý do fallback nên **chưa thể khẳng định exception lịch sử cụ thể**.

Các lần live audit trước diễn ra trước migration widget, theo [CHATBOT_WIDGET_REPORT.md](CHATBOT_WIDGET_REPORT.md). Thiếu cột model lúc đọc lịch sử là nguyên nhân phù hợp với thời điểm và việc không có provider call; đây là **suy luận từ bằng chứng**, không phải error code đã lưu. Migration widget hiện đã có trong `SequelizeMeta`; full-model SELECT lịch sử và `resolveProvider()` **đều thành công hiện tại**.

`ai_profiles_enabled=true`, có một profile Gemini đang bật và khóa profile giải mã được. Khóa legacy không giải mã được nhưng nhánh legacy không được dùng khi profile đang bật; không tự thay khóa. Đợt đọc dữ liệu không gọi mạng tới Gemini; phép thử quản trị bổ sung dưới đây xác nhận provider hiện trả lời được.

Tại thời điểm chụp dữ liệu **ngày 06/10/2026**, hạn mức cấu hình là **20 lượt/ngày**: một nhóm IP đã có **20 log trong ngày 06/10**, tức chạm hạn mức; có 3 phiên, phiên lớn nhất 15 tin. Không xuất IP/session. Hạn mức chặn theo **IP hoặc phiên**, nên mở phiên khác trong cùng ngày vẫn bị hạn mức IP. Hạn mức bắt đầu ngày mới theo giờ Việt Nam; số liệu này không khẳng định quota của ngày 07/10. Không tăng hạn mức, đặt lại quota hay dùng IP khác để vượt giới hạn.

## Phép thử model qua luồng quản trị hiện có

Đã thử đúng 5 câu qua `resolveProvider().provider.chat()` với profile/prompt/params đang lưu, context từ `buildChatContext()`, lịch sử rỗng cho từng câu. Đây là phép thử nội bộ theo yêu cầu gốc, tương đương luồng playground quản trị; không gọi `/public/chat` hoặc `answerQuestion()`, không truyền IP/session, không thay đổi public quota. Provider/model vẫn là **Gemini / gemini-2.5-flash**. Không đổi prompt, tham số hoặc dữ liệu để tạo kết quả thuận lợi.

**Kết quả: 5/5 nhận phản hồi, 0 lỗi provider.** Database ghi đúng 5 usage records bình thường; số log hội thoại **trước và sau đều 28**. Dữ liệu đầu ra: [ai-chat-logs-provider-probe.json](ai-chat-logs-provider-probe.json); script: [probe-chatbot-admin.cjs](../../server/scripts/probe-chatbot-admin.cjs). Script này có gọi mạng và có chi phí usage như phép thử quản trị thông thường, khác với script read-only bên trên.

| Câu hỏi | Thời gian gồm retrieval | Phản hồi model | Đánh giá |
| --- | ---: | --- | --- |
| Giá MXH100 | 4.254ms | Không có thông tin MXH100 trong dữ liệu cung cấp, hướng dẫn hỏi tổng đài/website | Model trả lời được; retrieval bỏ mất gói do `code=XMH100` |
| Giá/ưu đãi TK135 | 2.161ms | 135.000 VNĐ/30 ngày, chưa có thông tin ưu đãi cụ thể | Đúng giá/chu kỳ, không bịa ưu đãi |
| Gói dưới 100.000đ | 2.555ms | Không có gói dưới 100.000đ; rẻ nhất MXH100 100.000đ/30 ngày | Khớp danh mục hiện hành |
| Cửa hàng gần tôi | 2.741ms | Liệt kê 4 cửa hàng kèm địa chỉ/giờ, để khách tham khảo cửa hàng thuận tiện | Không tự nhận biết vị trí hay khẳng định gần nhất; có thể cải thiện bằng hỏi vị trí |
| Gói cước nào rẻ | 1.763ms | MXH100 giá 100.000 VNĐ/30 ngày | Khớp giá thấp nhất trong 2 gói |

Provider báo tổng **6.870 input tokens**, **1.332 output tokens** cho 5 câu. Không phát sinh fallback chung trong phép thử này. Điều này xác nhận **Gemini hoạt động qua mạng tại thời điểm thử ngày 06/10/2026**; 5/5 fallback lịch sử không chứng minh model đang hỏng. Với public chat ngày 06/10, nhóm IP đã chạm quota nhận thông báo hạn mức như cấu hình. Chất lượng dữ liệu/retrieval còn các vấn đề riêng: mã MXH100 sai, tri thức trống, ưu đãi/cú pháp thiếu, và nhiều nguồn không liên quan.

## Đề xuất cần duyệt

1. Rà soát file 72 dòng và lưu các dòng đã xác nhận; không nhập lại mù nếu chưa đối chiếu môi trường. Sửa mã `XMH100` thành `MXH100` sau khi xác nhận với chủ dữ liệu; bổ sung ưu đãi/cú pháp từ nguồn chính thức, giữ trống những phần chưa biết.
2. Thêm chặn backend khi **lưu `active`** mà tiêu đề/nội dung/tags còn placeholder; cho phép lưu `inactive` để hoàn thiện. Retrieval bỏ qua cả bản ghi còn placeholder trước khi giới hạn số mục. Client hiện chỉ cảnh báo/cho phép lưu tiếp; chưa có chặn server.
3. Nâng retrieval bằng trọng số trường/mã gói, lọc theo chủ đề và giới hạn giá khi câu hỏi có mức tiền; không cần đổi provider/model. Không nói có ngưỡng/embedding nếu chưa triển khai.
4. Sau xác nhận dữ liệu, truyền cấu hình website đã chọn vào context và bổ sung quy tắc không bịa giá/cú pháp/chính sách/hotline; không tự đổi prompt hiện tại.
5. Bổ sung lý do fallback, nguồn/ID/tiêu đề đoạn, số đoạn và trạng thái trả lời vào log; score giữ `null` với retrieval hiện tại. Có dữ liệu này mới tách được lỗi DB/cấu hình/provider với thiếu tri thức trong thống kê và drawer.
6. Sau khi người quản trị duyệt sửa dữ liệu/cấu hình, chạy lại 5 câu để đánh giá context/câu trả lời đã cải thiện chưa. Gemini đã trả lời được qua phép thử quản trị; kiểm tra public chat khi hạn mức cho phép là bước riêng, không reset hoặc tăng quota để kiểm thử.

Không thay đổi nào trong các đề xuất trên đã được thực hiện bởi script chẩn đoán.
