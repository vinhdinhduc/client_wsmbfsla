import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { NewsFilterList } from './_components/NewsFilterList';
import styles from './page.module.scss';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Tin tức, khuyến mãi và sự kiện mới nhất từ MobiFone Sơn La.',
};

export default async function NewsListPage() {
  const initialData = await newsApi
    .listPublic({ page: 1, page_size: 9 }, { next: { revalidate: 60 } })
    .catch(() => ({ items: [], total: 0, page: 1, page_size: 9 }));

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Tin tức' }]} />
      <h1 className={styles.title}>Tin tức & Khuyến mãi</h1>
      <NewsFilterList initialData={initialData} />
    </div>
  );
}
