import styles from '@/styles/service-pages.module.scss';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { env } from '@/lib/env';
import { utilitiesApi } from '@/lib/api/utilities';

export const metadata: Metadata = {
  title: 'Tiện ích',
  description: 'Ứng dụng, công cụ và tài liệu hữu ích từ MobiFone Sơn La.',
};

export default async function Utilities() {
  const [items, downloads] = await Promise.all([
    utilitiesApi.list().catch(() => []),
    utilitiesApi.downloads().catch(() => []),
  ]);

  return (
    <main className={styles.page}>
      <Breadcrumb items={[{ label: 'Tiện ích' }]} />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Kết nối cuộc sống số</p>
        <h1>Tiện ích MobiFone</h1>
        <p>Khám phá ứng dụng, công cụ và tài liệu hữu ích dành cho bạn.</p>
      </header>
      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.card}>
            {/* URL ảnh được quản trị viên cấu hình và đã được backend kiểm tra. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.card_image && (
              <img
                src={item.card_image}
                alt=""
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
              />
            )}
            <h2>{item.name}</h2>
            <p>{item.summary}</p>
            <Link href={`/tien-ich/${item.slug}`}>Chi tiết →</Link>
          </article>
        ))}
      </div>
      {!items.length && (
        <p className={styles.notice}>
          Các tiện ích đang được cập nhật. Bạn có thể sử dụng các công cụ nhanh bên dưới.
        </p>
      )}
      <section>
        <h2>Trung tâm tải về</h2>
        {!downloads.length && <p className={styles.notice}>Chưa có tài liệu để tải về.</p>}
        {downloads.map((file) => (
          <p key={file.id} className={styles.download}>
            <a href={`${env.NEXT_PUBLIC_API_URL}/public/downloads/${file.id}/file`}>{file.title}</a>{' '}
            <span>
              {file.category} · {file.download_count} lượt tải
            </span>
          </p>
        ))}
      </section>
      <section>
        <h2>Công cụ nhanh</h2>
        <nav className={styles.links} aria-label="Công cụ nhanh">
          <Link href="/cua-hang">Tìm cửa hàng</Link>
          <Link href="/goi-cuoc">Tìm gói cước</Link>
          <Link href="/sim-so-dep">Tra cứu sim</Link>
          <Link href="/tra-cuu">Tra cứu đăng ký</Link>
          <Link href="/dat-lich">Đặt lịch</Link>
        </nav>
      </section>
    </main>
  );
}
