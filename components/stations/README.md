# Bản đồ trạm BTS

Trang quản trị: `/admin/stations`. Chỉ vai trò `admin` được xem và sửa dữ liệu.
Backend kiểm tra JWT và quyền trên mọi endpoint; dữ liệu BTS không đi qua API public.

## Thành phần

- `StationDashboard.tsx`: React Query, bộ lọc trạng thái đa lựa chọn, loại trạm,
  tìm kiếm debounce 300ms, tìm 5 trạm gần nhất, xuất Excel, CRUD.
- `StationMap.tsx`: react-leaflet + OpenStreetMap, marker theo trạng thái,
  leaflet.markercluster, leaflet.heat, popup dùng text nodes chống chèn HTML.
- `StationForm.tsx`: form nhập đủ trường trạm, tọa độ và đơn vị đo rõ ràng.
- `Stations.module.scss`: dùng biến theme admin, light/dark, panel xuống dưới bản đồ
  khi chiều rộng dưới 900px. Bản đồ chỉ được tải phía client (`ssr: false`).
  Container tạo map và dọn map trong cùng effect, dùng context từ React Leaflet Core
  để tương thích với việc Strict Mode chạy lại lifecycle của Next.js 15.
- `types/station.ts`, `lib/api/stations.ts`: DTO và client API.

## Database và triển khai

Repository hiện dùng Sequelize/MySQL. Migration:
`server_mbf_sonla/migrations/20260927000001-create-stations.js`.

Trong thư mục backend:

```sh
npm run migrate
npm run build
```

Trong thư mục frontend:

```sh
npm ci
npm run build
```

Migration tạo bảng `stations` và index theo `status,type`, `latitude,longitude`.
`code` là duy nhất; `installed_at` là DATEONLY. Công suất tính bằng W; bán kính bằng m.
Các trường tùy chọn dùng `null`. Các trường ngày tạo/cập nhật do Sequelize quản lý.

| Trường | Ý nghĩa |
| --- | --- |
| `id`, `code`, `name`, `address` | ID, mã, tên và địa chỉ trạm |
| `latitude`, `longitude` | Vĩ độ [-90,90], kinh độ [-180,180] |
| `type` | `2G`, `3G`, `4G`, `5G` |
| `status` | `active`, `warning`, `incident`, `maintenance` |
| `power_watts` | Công suất phát (W), tùy chọn |
| `coverage_radius_m` | Bán kính phủ sóng ước tính (m), tùy chọn |
| `installed_at`, `notes` | Ngày lắp đặt và ghi chú |
| `created_at`, `updated_at` | Thời điểm tạo/cập nhật |

Chưa có driver hoặc nguồn Oracle trong repo. Nếu Oracle là nguồn BTS thực tế,
cần bổ sung bộ đồng bộ vào bảng này sau khi có thông tin kết nối và ánh xạ trường.

## API

Các đường dẫn tương đương: `/api/stations`, `/api/v1/stations`,
`/api/admin/stations`, `/api/v1/admin/stations`.
Frontend dùng `/admin/stations` qua API base URL đang cấu hình sẵn.
Tất cả đều yêu cầu `Authorization: Bearer <JWT admin>` và trả `Cache-Control: private, no-store`.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/api/stations` | Danh sách có phân trang và bộ lọc |
| GET | `/api/stations/:id` | Chi tiết |
| POST | `/api/stations` | Thêm trạm |
| PUT | `/api/stations/:id` | Thay toàn bộ dữ liệu biểu mẫu |
| DELETE | `/api/stations/:id` | Xóa trạm, ghi audit log |
| GET | `/api/stations/nearest?latitude=21.3256&longitude=103.9188&limit=5` | Trạm gần nhất trong toàn bộ dữ liệu |
| GET | `/api/stations/geocode?address=...` | Geocoding qua backend |

Ví dụ bộ lọc:

```text
/api/stations?status=active,warning&type=4G&search=SL&bbox=103,20,105,23&page=1&limit=500
```

`bbox` là `west,south,east,north`, không hỗ trợ khung nhìn vượt kinh tuyến 180°.
`limit` mặc định 500, tối đa 1000. Phản hồi theo envelope hiện tại:

```json
{
  "success": true,
  "data": { "items": [], "total": 0, "page": 1, "limit": 500 },
  "message": ""
}
```

Frontend đọc đủ các trang để không mất trạm khi vượt 1000 bản ghi. Toggle
“Chỉ tải trạm trong khung nhìn” gửi `bbox` sau `moveend` debounce 300ms,
phù hợp khi có nhiều trạm. Tìm kiếm và Excel tuân theo bộ lọc, bao gồm `bbox`
khi bật. Excel xuất toàn bộ danh sách đang hiển thị trên bản đồ, không chỉ
25 dòng đang xem trong bảng. Cụm marker vẫn chứa từng trạm, không xuất thành cụm.

Danh sách tìm gần nhất luôn xét toàn bộ trạm, độc lập với bộ lọc; tính Haversine
phía backend, sắp xếp tăng dần và trả tối đa 5 trạm. Chọn một kết quả sẽ xóa
bộ lọc để hiện đúng marker. Với quy mô rất lớn cần chuyển truy vấn gần nhất
sang spatial index hoặc bounding box mở rộng trước khi xếp hạng.

## Đồng bộ và hiển thị

Sau CRUD, React Query invalidate toàn bộ query `stations`. Các phiên đang mở
làm mới mỗi 30 giây khi tab hoạt động và khi quay lại cửa sổ. Không cần sửa Google Maps.

Mặc định tắt vòng phủ sóng và heatmap. Bán kính dùng `coverage_radius_m` của
trạm hoặc giá trị nhập trong panel (mặc định 1500m). Đây là vòng tròn tham khảo;
không suy ra chất lượng sóng chỉ từ công suất. Heatmap dùng mật độ trạm, không
đọc hoặc giả lập dữ liệu thuê bao/VNEID.

Repo chưa có nguồn hiệu năng BTS, nên chưa tạo endpoint `/metrics` hoặc số liệu
giả. Có thể nối nguồn sau khi có hợp đồng dữ liệu, đơn vị và timestamp đo thực tế.

Bản đồ cửa hàng công khai hiện có tại `app/(public)/cua-hang` đã dùng Leaflet và
API cửa hàng riêng. Không có iframe My Maps BTS trong mã nguồn hiện tại để thay.

## Tìm địa chỉ và bản đồ nền

Nhập trực tiếp `21.3256, 103.9188` hoạt động không cần dịch vụ geocoding.
Để tìm địa chỉ, cấu hình backend (không đưa thông tin này vào frontend):

```dotenv
GEOCODING_USER_AGENT=MobiFone-SonLa-BTS/1.0 (contact: dia-chi-lien-he-thuc-te)
GEOCODING_SEARCH_URL=https://nominatim.openstreetmap.org/search
```

Production yêu cầu `GEOCODING_SEARCH_URL` tường minh. Có thể thay bằng endpoint
Nominatim tự vận hành hoặc dịch vụ tương thích. Provider giới hạn khoảng cách
giữa request 1100ms trong một process, cache 24 giờ (tối đa 1000 mục), timeout
8 giây. Tìm địa chỉ chỉ chạy khi nhấn nút, không gọi autocomplete.
Nếu chạy nhiều process/replica, dùng geocoder riêng hoặc bộ giới hạn tốc độ chung.

Tile mặc định là `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
Có thể cấu hình `NEXT_PUBLIC_STATION_TILE_URL` trước khi build cho dịch vụ tile
OSM riêng. Nếu nhà cung cấp yêu cầu attribution bổ sung, sửa attribution ở
`StationMap.tsx` theo điều khoản của họ.

Tham khảo chính thức:
[Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/),
[OSM tile policy](https://operations.osmfoundation.org/policies/tiles/),
[markercluster](https://leaflet.github.io/Leaflet.markercluster/),
[Leaflet.heat](https://github.com/Leaflet/Leaflet.heat).

## Kiểm thử

Backend: `npm test -- stations.test.ts station.routes.test.ts` kiểm tra validation,
phân quyền đọc/ghi, bbox, phân trang, mã trùng và khoảng cách.
`STATION_DB_TEST=1` bật `tests/integration/stations.mysql.test.ts`; mọi dữ liệu
thử nghiệm nằm trong transaction và được rollback.

Frontend: `npx playwright test e2e/stations.spec.ts` kiểm tra clustering,
các lớp bản đồ, lọc, popup an toàn, Excel, CRUD, mobile và quyền truy cập.
Đặt `E2E_BASE_URL` tới frontend đang chạy; nếu dùng Chrome sẵn trên máy,
đặt `E2E_BROWSER_CHANNEL=chrome`. API và tile được mock trong bài kiểm thử giao diện.
