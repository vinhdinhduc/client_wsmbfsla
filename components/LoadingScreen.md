# LoadingScreen

Component dùng SCSS Modules như các component hiện có, không thêm thư viện.
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

Provider giữ overlay bên ngoài Suspense để chạy fade-out khi fallback bị gỡ.
Fallback vẫn render logo trong HTML ban đầu trước hydration.
Cũng có thể dùng `<Suspense fallback={<RouteLoadingFallback />}>` bên trong provider.
Dùng `<LoadingScreen fullScreen={false} />` cho loading trong một khối;
fallback Suspense trực tiếp sẽ được React gỡ ngay khi nội dung sẵn sàng.

Next.js chỉ hiển thị fallback khi route thực sự chờ nội dung; route đã cache
có thể xuất hiện ngay. `loading.tsx` riêng của route con được ưu tiên, ví dụ
`app/(public)/giai-phap-so/loading.tsx` hiện vẫn dùng skeleton sẵn có.
Loading này không tự theo dõi các request fetch trong `useEffect` hoặc React Query;
với các request đó, truyền trạng thái loading qua prop `visible` như ví dụ trên.

Tham khảo: [Next.js Loading UI and Streaming](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming).
