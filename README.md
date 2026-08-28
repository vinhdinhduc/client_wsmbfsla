# MobiFone Sơn La - Website (Frontend)

Frontend Next.js (App Router) cho dự án "Website MobiFone Chi nhánh Sơn La" - gồm 2 phân hệ:

- **Public** (`app/(public)`): Server Component, tối ưu SEO - trang chủ, sim số đẹp, gói cước, giải pháp số, cửa hàng, tin tức, giỏ hàng, liên hệ...
- **Admin** (`app/(admin)/admin`): Client Component sau xác thực JWT - CRUD nội dung, quản lý đăng ký/liên hệ, slider, người dùng, ca trực, cài đặt, nhật ký thao tác.

## Yêu cầu

- Node.js ≥ 18.18
- Backend API (thư mục `server/`) đã chạy sẵn tại `NEXT_PUBLIC_API_URL`

## Cài đặt

```bash
cd client
npm install
cp .env.example .env
```

Điền các biến trong `.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site key reCAPTCHA v3 của bạn>
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Biến môi trường được validate bằng zod (`lib/env.ts`) - ứng dụng sẽ fail sớm với thông báo rõ ràng nếu thiếu/sai định dạng.

## Chạy dev

```bash
npm run dev
```

Mở `http://localhost:3000`. Trang quản trị tại `http://localhost:3000/admin/login`.

## Build & chạy production

```bash
npm run build
npm run start
```

## Lint

```bash
npm run lint
```

Husky + lint-staged đã được cấu hình để tự chạy ESLint + Prettier trước mỗi commit (`npm run prepare` chạy tự động sau `npm install`).

## Ghi chú triển khai quan trọng (đọc trước khi bàn giao)

1. **Slider admin không dùng upload file ảnh trực tiếp.** Route backend
   `POST /api/admin/sliders/items` có gắn middleware Multer nhưng
   validator/service chỉ đọc `image_url` dạng chuỗi từ JSON body và không đọc
   `req.file`. Vì Multer chỉ can thiệp khi request thực sự là
   `multipart/form-data`, form Admin Slider gửi JSON thuần với trường "URL hình
   ảnh" thay vì file picker - đây là cách duy nhất hoạt động đúng với backend
   hiện tại mà không sửa code backend.
2. **`GET /api/public/settings` chỉ trả về 6 khóa cố định**: `site_name`,
   `site_logo`, `hotline`, `theme_primary_color`, `home_banner`,
   `ai_chatbot_enabled`. Các khóa khác (vd `ga4_id`, `fb_pixel_id`) tuy có thể
   lưu qua `PUT /api/admin/settings` nhưng KHÔNG được endpoint public trả về -
   Google Analytics/Meta Pixel vì vậy dùng trực tiếp biến môi trường
   `NEXT_PUBLIC_GA4_ID`/`NEXT_PUBLIC_FB_PIXEL_ID`.
3. **Trang Giới thiệu, Tuyển dụng, Chính sách bảo mật, Điều khoản sử dụng** là
   nội dung tĩnh - backend hiện chưa có entity/API riêng cho các trang này.
4. **Trang tìm kiếm** (`/tim-kiem`) được bổ sung ngoài sitemap gốc để hiện
   thực hóa dòng "Trang tìm kiếm... CSR" ở mục 12 của bản thiết kế, dùng lại
   endpoint `GET /api/public/search`.

## Cấu trúc thư mục

Xem chi tiết trong bản thiết kế gốc (mục 13) - cấu trúc thư mục đã được sinh
đúng theo đặc tả, gồm `app/`, `components/`, `actions/`, `lib/`, `hooks/`,
`types/`, `contexts/`, `middleware.ts`.
