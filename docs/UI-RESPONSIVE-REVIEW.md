# Rà soát giao diện MobiFone Sơn La

## Giai đoạn 1 — khảo sát trước khi sửa

- Next.js 15 / React 18, SCSS Modules + `app/globals.scss`; không dùng Tailwind hoặc UI library bên ngoài. Không thêm dependency.
- Font: Be Vietnam Pro cho heading, Inter cho nội dung. Icon: `lucide-react`.
- Token tại `app/globals.scss`, khoảng cách/breakpoint tại `styles/_variables.scss`; dark mode qua `ThemeContext` và `[data-theme='dark']`.
- Màu primary sáng `#0066b3`, hover `#004a85`; primary tối `#4a9eff`. Viền `--border` sáng `#e5e7eb`, tối `#2a2e3a`. Nền control `--color-surface`.
- Form mẫu Cài đặt và Liên hệ đều tái dùng `components/ui/FormField.tsx` và `Button.tsx`. Control cũ cao 2.5rem (40px), chữ .875rem (14px), bo 8px, viền 1px, focus `0 0 0 3px rgb(0 102 179 / 24%)`, label trên control, gap form 1rem. Button primary nền xanh/chữ trắng.
- Sidebar cũ dùng breakpoint 640px; panel Cài đặt max-width 36rem và không căn giữa. Tiện ích/Tuyển dụng dùng grid inline, control trình duyệt.
- Tuyển dụng: `category` = Nhóm ngành; `location` = Địa điểm; `description` = Mô tả công việc HTML; `requirements` = Yêu cầu HTML; `benefits` = Quyền lợi HTML.
- `AboutBlocksEditor` không có enum loại khối, vì vậy giữ Input cho `type`.
- Route Tiện ích thực tế là `/admin/utilities`; không tạo hoặc đổi route `/admin`.

### Các control thô đã xử lý trong phạm vi

| File | Điểm cần sửa trước đó |
| --- | --- |
| `app/(admin)/admin/utilities/page.tsx` | Toàn bộ input, textarea, select, nút lưu/sửa/xóa |
| `app/(admin)/admin/jobs/page.tsx` | Toàn bộ form, checkbox, select trạng thái, nút thao tác/xuất Excel/tải CV |
| `app/(admin)/admin/settings/AboutBlocksEditor.tsx` | Fieldset, input, textarea, checkbox, nút thứ tự/xóa/thêm |
| `app/(public)/lien-he/_components/ContactForm.tsx` | Hai select và checkbox đồng ý |
| `components/layout/Header.tsx` | Input/nút trong hộp tìm kiếm; menu Giới thiệu thao tác chạm |

### Các trang admin khác — chỉ liệt kê, không sửa markup

| File | Control còn dùng giao diện native hoặc style chưa đầy đủ |
| --- | --- |
| `app/(admin)/admin/news/NewsEditor.tsx` | Input/select/textarea/fieldset/nút lưu; toàn bộ editor chưa dùng bộ form chung |
| `app/(admin)/admin/news/page.tsx` | Input/select lọc ở toolbar |
| `app/(admin)/admin/packages/page.tsx` | Input/select tìm kiếm; checkbox/fieldset bổ sung trong form |
| `app/(admin)/admin/sims/page.tsx` | Select thao tác trong danh sách, fieldset/checkbox chọn cột xuất; file input |
| `app/(admin)/admin/stores/page.tsx` | Checkbox các ngày trong khung giờ mở cửa |
| `app/(admin)/admin/sliders/page.tsx` | File input ảnh desktop/mobile |
| `app/(admin)/admin/users/page.tsx` | Checkbox công khai hồ sơ; file input avatar |
| `app/(admin)/admin/login/page.tsx` | Checkbox ghi nhớ đăng nhập còn native |

Các thay đổi ở component dùng chung và layout có hiệu lực ở nơi đang sử dụng chúng; không chỉnh riêng các trang ngoài phạm vi.

### HTML thuần không đồng nghĩa chưa style

Đã đối chiếu SCSS của phần tử cha cho các file sau. Chúng có control native nhưng đã có CSS, nên không coi toàn bộ trang là chưa style:

- Admin: `ai-knowledge/page.tsx`, `ai-settings/page.tsx`, `dashboard/page.tsx`, `email/page.tsx`, `rate-limits/page.tsx`, `registrations/page.tsx`, `solutions/SolutionEditor.tsx`.
- Công khai: `dat-lich/quan-ly/page.tsx`, `tra-cuu/page.tsx`, `tuyen-dung/page.tsx`, `tuyen-dung/[slug]/JobApplyForm.tsx`, `gio-hang/page.tsx`, `gio-hang/_components/SonLaAddressFields.tsx`, `goi-cuoc/_components/PackageFilterBar.tsx`, `sim-so-dep/_components/SimCatalogControls.tsx`, `giai-phap-so/[slug]/_components/SolutionContent.tsx`.
- Component: `home/HomeCatalogSections.tsx`, `shared/ChatWidget.tsx`, `shared/IconPicker.tsx`.
- Ngoài phạm vi còn cần rà soát nút sao chép trong `app/(public)/tin-tuc/[slug]/_components/ShareButtons.tsx`, nút popup trong `components/shared/CampaignNotices.tsx`, và native file input trong `components/shared/ImageUploadField.tsx`.
- Các input ẩn/honeypot, file input ẩn của RichTextEditor không phải control cần style hiển thị.

## Giai đoạn 2–7 — triển khai

- Tái dùng FormField/TextField/TextareaField/SelectField/CheckboxField; có alias Input/Textarea/Select/Checkbox. Control tối thiểu 44px, chữ 16px, label có `htmlFor`, hint/error có ID, `aria-invalid`/`aria-describedby`. Textarea tự giãn, select có mũi tên CSS, checkbox có vùng bấm 44px.
- Button hỗ trợ primary/secondary/outline/danger/ghost, size, disabled, loading; dark mode dùng chữ tối trên nền xanh sáng để tăng tương phản.
- Thêm FormCard, FormSection, PageHeader, FormActions, IconButton, EmptyState, QueryState, ImagePreview, ResponsiveTable tại `components/ui/FormLayout.tsx`.
- Admin: sidebar cố định từ 1024px; drawer có overlay, Esc, focus trap/khôi phục focus, nội dung ngoài drawer inert, đóng khi chọn menu hoặc đổi lên desktop. Container tối đa 80rem, căn giữa, padding 16/24/32px, dùng dvh.
- Tiện ích/Tuyển dụng chia nhóm theo yêu cầu; loading, lỗi, empty; bảng desktop/tablet cuộn trong vùng riêng, card mobile. Xác nhận xóa bằng dialog native. API, field, state nghiệp vụ, payload, slug và schema giữ nguyên.
- About: card con, badge loại, icon lên/xuống/xóa, disabled theo vị trí, xác nhận xóa, nút thêm nét đứt; textarea ít nhất 140px. Thanh lưu sticky mobile. Không remount input mỗi lần sửa `type`.
- Liên hệ: hai select dùng chung; mobile form đứng trước, desktop card hỗ trợ sticky; tel/mailto, inputMode tel, consent điều khiển disabled, loading, khoảng trống đáy. Widget ở trang Liên hệ mobile thu gọn thành hai nút Zalo/gọi điện, ẩn thẻ giới thiệu nổi để giảm che form; không đổi logic widget. Header: menu dưới lg, hotline icon, submenu Giới thiệu có nút chạm, Esc đóng menu.

## Giai đoạn 8 — xác minh

Kiểm tra tự động tại `e2e/ui-responsive.spec.ts`, dùng fixture API phía trình duyệt, không ghi dữ liệu thật. Ma trận 360, 390, 768, 1024, 1280, 1536px × sáng/tối × bốn trang. Ảnh lưu ở `ui-artifacts/`.

Đã kiểm tra đủ 48 tổ hợp trang/kích thước/theme, không có scroll ngang cấp trang và control đạt tối thiểu 44px/16px. Bộ kiểm tra còn xác minh drawer/Esc/focus, sắp xếp và xác nhận xóa khối, consent, empty, loading, thông báo lưu và payload tiện ích.

## Bổ sung — lỗi bản đồ Cửa hàng

Kết quả cuối ngày 25/09/2026:

- Development/Strict Mode: **17/17** ca đạt, gồm hồi quy bản đồ.
- Production: **16/16** ca giao diện đạt (37,5 giây); đã cập nhật 48 ảnh responsive sáng/tối.
- Typecheck đạt; lint không có lỗi, còn 7 cảnh báo ảnh có sẵn.
- Build production đạt, sinh 61/61 trang; còn cảnh báo Sass có sẵn tại Footer/Breadcrumb.
- Kiểm tra bằng Chromium với viewport giả lập; chưa kiểm tra trên thiết bị vật lý.
- Cấu hình Next.js/TypeScript đã khôi phục nguyên trạng sau khi dùng cache build riêng để tránh khóa file Windows.

Theo ảnh lỗi được cung cấp ngày 25/09: `Map container is already initialized` tại `StorePublicMap.tsx`. Phiên bản react-leaflet đang cài khởi tạo bản đồ trong callback ref có thể chạy lại trên cùng DOM node khi React gắn lại ref. Component bản đồ công khai chuyển sang quản lý Leaflet trực tiếp bằng effect có cleanup đối xứng (`map.remove()`), vẫn dùng thư viện Leaflet sẵn có; không thay API, dữ liệu cửa hàng, tile provider hoặc cách chọn/lọc cửa hàng. Popup được tạo bằng textContent để giữ hành vi escape nội dung.

`e2e/store-map-lifecycle.spec.ts` kiểm tra chọn marker, popup, lọc xã/phường, ba lượt điều hướng đi/quay lại và reload trong development/Strict Mode. Không phát sinh lỗi JavaScript; không có lớp bản đồ hoặc nút zoom trùng.

Chạy lại bằng hai terminal PowerShell từ thư mục `client`:

```powershell
node e2e/support/ui-dev-server.cjs
```

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3003'
$env:E2E_UI_FIXTURES='1'
node node_modules/@playwright/test/cli.js test e2e/ui-responsive.spec.ts e2e/store-map-lifecycle.spec.ts
```

Server kiểm tra dùng cổng 3003, API fixture cổng 4003 và thư mục cache riêng. Bộ hồi quy bản đồ chỉ chạy khi bật `E2E_UI_FIXTURES`, tránh yêu cầu dữ liệu fixture trên server thật. Ảnh xem tại `ui-artifacts/index.html` và `ui-artifacts/stores-map.png`.
