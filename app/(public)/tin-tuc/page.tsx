import { Metadata } from 'next';
import { Suspense } from 'react';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { NewsFilterList } from './_components/NewsFilterList';
import styles from './page.module.scss';
import Link from 'next/link';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Tin tức, khuyến mãi và sự kiện mới nhất từ MobiFone Sơn La.',
};

export default async function NewsListPage() {
  const [initialData, featured] = await Promise.all([
    newsApi
      .listPublic({ page: 1, page_size: 9 }, { next: { revalidate: 60 } })
      .catch(() => ({ items: [], total: 0, page: 1, page_size: 9 })),
    newsApi.featured().catch(() => []),
  ]);

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Tin tức' }]} />
      <h1 className={styles.title}>Tin tức & Khuyến mãi</h1>
      {featured.length > 0 && (
        <section
          aria-label="Tin nổi bật"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: 16,
            margin: '24px 0',
          }}
        >
          {featured.map((item, index) => (
            <Link
              key={item.id}
              href={`/tin-tuc/${item.slug}`}
              style={{
                minHeight: index === 0 ? 280 : 180,
                padding: 24,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'end',
                color: 'white',
                background: `linear-gradient(0deg,rgba(0,0,0,.75),rgba(0,0,0,.1)),url(${item.cover_url || item.thumbnail || ''}) center/cover`,
              }}
            >
              <h2>{item.title}</h2>
            </Link>
          ))}
        </section>
      )}
      <Suspense fallback={<p>Đang tải tin tức…</p>}>
        <NewsFilterList initialData={initialData} />
      </Suspense>
    </div>
  );
}
