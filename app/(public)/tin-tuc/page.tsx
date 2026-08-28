import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { NewsFilterList } from './_components/NewsFilterList';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Tin tức, khuyến mãi và sự kiện mới nhất từ MobiFone Sơn La.',
};

export default async function NewsListPage() {
  const initialData = await newsApi.listPublic({ page: 1, page_size: 9 }, { next: { revalidate: 60 } });

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Tin tức' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Tin tức & Khuyến mãi</h1>
      <NewsFilterList initialData={initialData} />
    </div>
  );
}
