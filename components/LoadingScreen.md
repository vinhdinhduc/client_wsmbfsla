# LoadingScreen và rèm mở trang

## Rèm mở trang lần đầu

`InitialPageLoader` nằm trong provider gốc, bên ngoài Suspense. Nội dung trang
vẫn được render trong HTML và bên dưới lớp phủ. Bootstrap chạy trước hydration
để bật rèm ngay lần đầu và tránh nháy rèm khi đã xem trong cùng phiên/tab.

- `NEXT_PUBLIC_INITIAL_LOADER_ENABLED=true` (mặc định): bật ở trang công khai.
- `NEXT_PUBLIC_ADMIN_INITIAL_LOADER_ENABLED=false` (mặc định): có thể bật lại ở admin.
- Biến `NEXT_PUBLIC_*` được chốt khi build; cần build lại sau khi đổi cấu hình.
- Session key: `mfsl_initial_loader_seen_v1`, dùng chung cho hai khu vực nếu bật cả hai.
  Tab mới độc lập hiển thị lại; link mở tab mới nên có `rel="noopener"` để tránh
  trình duyệt sao chép sessionStorage từ tab mở nó. Duplicate tab có thể kế thừa phiên.
- Tối thiểu 800ms; tiến trình mô phỏng dừng ở 90%. Chỉ kết thúc khi `window.load`,
  `document.fonts.ready` và fallback Suspense đã xong. Không đợi tất cả request nền.
- Khi sẵn sàng: tiến trình tới 100%, logo mờ và dịch lên trong 220ms; sau 240ms
  rèm trượt lên 900ms với `cubic-bezier(.77, 0, .18, 1)` và mép cong bầu xuống.
- Sau 8 giây tự kết thúc dù tài nguyên chưa xong. Bootstrap cũng có giới hạn này
  nếu JavaScript của React tải chậm; lớp phủ bị ẩn và cuộn được mở khóa.
- Reduced motion: chỉ fade 200ms. Rèm được gỡ DOM khi transition kết thúc, có
  timeout dự phòng. Khóa cuộn bằng CSS; bù chiều rộng scrollbar bằng padding
  trong lúc rèm phủ kín viewport để không dịch bố cục.
- Không JavaScript: bootstrap không bật lớp phủ hay khóa cuộn; nội dung trang
  vẫn nằm trong HTML của Next.js (cơ chế streaming của Next không thay đổi).

Chuyển route nội bộ dùng `LoadingScreen` dạng inline; không bật lại rèm toàn màn hình.
Các ảnh `/logo.png` và `/logo_ngan_cropped.png` đã có alpha trong suốt.
Nền của logo chân sidebar là `var(--color-primary)`, đổi theo theme; sidebar hiện
không có chế độ thu gọn thành thanh biểu tượng.

Kiểm tra: chạy server fixture `node e2e/support/ui-dev-server.cjs`, rồi đặt
`E2E_BASE_URL=http://127.0.0.1:3003` và chạy
`npx playwright test --config=e2e/initial-loader-sidebar.config.ts`.
Config kiểm tra Chromium, Firefox, WebKit và WebKit giả lập iPhone.
Để kiểm tra Slow 3G và so sánh CLS/LCP khi bật/tắt rèm trên Chromium, chạy
`npx playwright test e2e/initial-loader-performance.spec.ts` với cùng `E2E_BASE_URL`.

Phép đo production cục bộ ngày 07/10/2026 trên `/chinh-sach-bao-mat`, hai lượt
mỗi chế độ: CLS trung bình khoảng 0.00045 khi bật rèm (0.00327 khi tắt), LCP
308ms khi bật (342ms khi tắt). Đây là số liệu của trang tham chiếu và fixture
cục bộ, không thay thế đo toàn website hay Safari trên thiết bị iOS thật.

Component dùng SCSS Modules như các component hiện có, không thêm thư viện.
## LoadingScreen dùng trong khối

Logo `/public/logo.png` có chữ mobi trắng và fone đỏ. Ba trạng thái dấu chấm
chạy bằng CSS, mỗi bước 350ms; logo pulse từ opacity 0.6 đến 1.

## Props

| Prop | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `text` | `"Đang tải"` | Nội dung thông báo |
| `fullScreen` | `true` | Overlay toàn màn hình; `false` hiển thị trong khối |
| `visible` | `true` | Đặt `false` để fade-out 300ms rồi gỡ DOM bên trong |

## Fetch dữ liệu trong Client Component

```tsx
'use client';

import LoadingScreen from '@/components/LoadingScreen';

export function DataView({ isLoading }: { isLoading: boolean }) {
  return (
    <>
      <LoadingScreen visible={isLoading} text="Đang tải dữ liệu" />
      {!isLoading && <main>Nội dung đã sẵn sàng</main>}
    </>
  );
}
```

Giữ component mounted và thay đổi `visible`. Viết
`{isLoading && <LoadingScreen />}` sẽ gỡ component ngay, không có fade-out.
JS chỉ dùng timeout một lần cho việc gỡ DOM; không dùng interval cho animation.
Chế độ giảm chuyển động tắt pulse, dấu chấm và transition.

## App Router / Suspense

Đã tích hợp `RouteLoadingProvider` trong `contexts/providers.tsx` và thêm
`app/loading.tsx`:

```tsx
import { RouteLoadingFallback } from '@/components/RouteLoadingProvider';

export default function Loading() {
  return <RouteLoadingFallback />;
}
```

Provider giữ rèm lần đầu bên ngoài Suspense; fallback render logo dạng inline
trong HTML và được gỡ khi nội dung route sẵn sàng.
Cũng có thể dùng `<Suspense fallback={<RouteLoadingFallback />}>` bên trong provider.
Dùng `<LoadingScreen fullScreen={false} />` cho loading trong một khối;
fallback Suspense trực tiếp sẽ được React gỡ ngay khi nội dung sẵn sàng.

Next.js chỉ hiển thị fallback khi route thực sự chờ nội dung; route đã cache
có thể xuất hiện ngay. `loading.tsx` riêng của route con được ưu tiên, ví dụ
`app/(public)/giai-phap-so/loading.tsx` hiện vẫn dùng skeleton sẵn có.
Loading này không tự theo dõi các request fetch trong `useEffect` hoặc React Query;
với các request đó, truyền trạng thái loading qua prop `visible` như ví dụ trên.

Tham khảo: [Next.js Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming).
