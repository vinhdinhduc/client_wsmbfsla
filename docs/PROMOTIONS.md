# Hộp quà khuyến mại

Admin quản lý tại `/admin/promotions`, trong menu **Hộp quà khuyến mại**. Trang này cho phép thêm, sửa, xóa, bật/tắt, xem trước bản nháp và xem lượt hiển thị, mở quà, bấm nút. Các API quản lý chỉ cho phép vai trò `admin`.

## Cách sử dụng

1. Thêm chương trình, nhập tên nội bộ, tiêu đề và nội dung ưu đãi/điều kiện. Nội dung là văn bản, giữ xuống dòng.
2. Có thể tải ảnh banner, thêm mã giảm giá và một nút có cả nhãn lẫn đường dẫn HTTP(S) hoặc `/...`.
3. Chọn hiệu ứng, vị trí hộp quà, kích hoạt ngay/sau số giây/khi cuộn, trang áp dụng, thiết bị và tần suất.
4. Nhập lịch theo **giờ Việt Nam (UTC+7)**. Bỏ trống một mốc để không giới hạn mốc đó. Kết thúc phải sau bắt đầu.
5. Bấm **Xem trước** để thử hiệu ứng và nội dung. Xem trước bỏ qua lịch, thiết bị, tần suất và thời điểm kích hoạt; không lưu chương trình, không ghi thống kê, không điều hướng khi bấm CTA.
6. Bật chương trình và lưu. Trang khách lấy cấu hình khi vào trang, chuyển trang, đổi nhóm kích thước màn hình, quay lại tab và tối đa mỗi 30 giây khi tab đang hoạt động.

## Quy tắc hiển thị

- Chỉ chương trình đang bật, trong lịch, đúng trang và thiết bị mới được chọn. Thời điểm bắt đầu được bao gồm; kết thúc không được bao gồm.
- Nếu nhiều chương trình phù hợp và còn lượt hiển thị theo tần suất, ưu tiên chương trình được tạo gần nhất. Mỗi trang chỉ hiện một chương trình trong một lần mở/chuyển trang, tránh hiện tiếp nhiều popup sau khi khách đóng.
- Danh sách trang áp dụng dùng đường dẫn chính xác, không tự bao gồm trang con. Không nhập tên miền, query hoặc fragment. `[]` áp dụng mọi trang công khai, `['/']` chỉ trang chủ. Admin không hiển thị hộp quà tự động.
- Điện thoại tương ứng màn hình tối đa 767px; máy tính từ 768px. Popup nội dung luôn ở giữa màn hình; vị trí cấu hình áp dụng cho hộp quà.
- **Mỗi lần truy cập:** một lần cho mỗi chương trình trong phiên của tab trình duyệt, dùng `sessionStorage`; tải lại hoặc chuyển trang không mở lại cùng chương trình.
- **Mỗi ngày một lần:** dùng `localStorage`, ngày tính theo giờ Việt Nam. **Chỉ một lần:** ghi nhớ cùng trình duyệt. Không nhận diện một người trên nhiều thiết bị/trình duyệt.
- Ghi nhớ ngay khi hộp quà/popup xuất hiện, kể cả khách đóng mà không mở. Nếu trình duyệt chặn storage, dùng bộ nhớ trong trang hiện tại.
- Hộp quà và popup có nút đóng. Popup hỗ trợ Escape, bấm ra ngoài và điều hướng bàn phím qua native `dialog`. Tôn trọng `prefers-reduced-motion`.

## Dữ liệu và API

Migration backend: `server/migrations/20261013000001-create-promotions.js`. Bảng `promotions` lưu cấu hình và ba bộ đếm. Bảng `promotion_events` chống đếm lặp theo `(promotion_id, visit_id, event)`; UUID được tạo cho từng lần hiển thị, không chứa thông tin khách. Sự kiện cũ hơn 90 ngày được dọn theo lô, các tổng đếm vẫn được giữ.

API dưới `/api/v1` (cũng hỗ trợ alias `/api` hiện có):

| Phương thức | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET/POST | `/admin/promotions` | Danh sách/tạo chương trình |
| GET/PUT/DELETE | `/admin/promotions/:id` | Đọc/cập nhật/xóa |
| POST | `/admin/media` | Tải ảnh banner qua luồng upload hiện có |
| GET | `/public/promotions?path=/goi-cuoc&device=mobile` | Lấy chương trình còn hiệu lực, phù hợp trang/thiết bị |
| POST | `/public/promotions/:id/events` | `{ event: 'impression' \| 'open' \| 'cta', visit_id: UUID }` |

API công khai không trả tên nội bộ hoặc thống kê. Bộ đếm tăng trong transaction, chống trùng lượt gửi; tắt/hết hạn sẽ từ chối sự kiện mới. Gửi CTA dùng `fetch` với `keepalive` để hỗ trợ điều hướng sang trang khác.

## Triển khai và kiểm tra

Chạy migration trước khi dùng frontend/backend mới. Migration tự chuyển popup cũ từ các khóa `promo_popup_*` sang một chương trình “Popup khuyến mại hiện có”, giữ trạng thái bật/tắt và không thay đổi các khóa cũ. Thanh thông báo vẫn cấu hình trong Cài đặt; popup được quản lý tại mục Khuyến mại.

```powershell
cd server
npm run migrate
```

Lệnh trên áp dụng mọi migration còn chờ. Với môi trường local có các migration khác đang chờ, dùng helper `node scripts/migrate-promotions.cjs` để chỉ áp dụng migration khuyến mại, có bản sao schema và cấu hình cũ. Helper từ chối host ngoài localhost và môi trường production.

Kiểm thử backend: `npm test -- --runTestsByPath tests/unit/promotions.test.ts tests/unit/promotion.model.test.ts tests/unit/promotion.routes.test.ts tests/unit/promotion.migration.test.ts` trong `server`.

Kiểm thử trình duyệt trong `client`: khởi động `node e2e/support/ui-dev-server.cjs`, sau đó chạy `npm run test:e2e -- --config=e2e/promotions.config.ts`. Cấu hình riêng mặc định dùng frontend fixture tại `http://127.0.0.1:3003`; có thể ghi đè bằng `E2E_BASE_URL`. Các kịch bản trình duyệt mock API, không tạo/xóa dữ liệu thật.

`node scripts/verify-promotions-migration.cjs` trong `server` kiểm tra migration bằng database MySQL local riêng, chỉ chứa dữ liệu kiểm thử.

## Kết quả local ngày 13/10/2026

- Migration khuyến mại đã áp dụng vào `mobifone_sonla`; không chạy các migration đang chờ khác. Bản sao schema và cấu hình cũ: `server/backups/promotions-schema-1791886178720.json`.
- Kiểm tra MySQL riêng biệt đạt: migration lên/xuống/chạy lại, giữ popup cũ, lọc chính xác trang/thiết bị, bộ đếm với các lần gửi đồng thời, chống trùng, kiểm tra lịch và xóa sự kiện theo chương trình.
- Đã sửa cách đọc JSON từ MariaDB và kiểm tra trường hợp danh sách trang bị trả dưới dạng chuỗi; trang chủ không khớp nhầm chương trình chỉ áp dụng một trang khác.
- TypeScript frontend/backend và lint các file frontend thay đổi đều đạt. `npm test` frontend: 30 kiểm thử đạt. Jest khuyến mại backend: 37 kiểm thử đạt.
- Chromium: 20 kịch bản đã đạt, gồm CRUD/xem trước, sao chép/CTA/thống kê, các tần suất, trigger, trang/thiết bị/lịch, giảm chuyển động, storage bị chặn, cập nhật hiệu ứng/mã và tắt chương trình qua polling, nút đóng khi nội dung dài trên mobile. 18 kịch bản đạt trong lượt chạy chính; hai kịch bản polling/nội dung dài đạt trong lượt riêng cuối cùng. Kiểm thử polling đã sửa đồng hồ giả lập để không đóng băng các effect/timer sau khi nhận dữ liệu API.
- Ảnh giao diện tại `docs/screenshots/promotions-*.png`, gồm hộp quà/popup desktop và mobile, danh sách và form admin.
