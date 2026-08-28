import { Metadata } from 'next';
import { solutionsApi } from '@/lib/api/solutions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SolutionFilterBar } from './_components/SolutionFilterBar';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Giải pháp số',
  description: 'Giải pháp số MobiFone Sơn La cho Doanh nghiệp (SME), UBND, Hộ kinh doanh và Cục/Ngành.',
};

export default async function SolutionsPage() {
  const solutions = await solutionsApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Giải pháp số' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Giải pháp số</h1>
      <SolutionFilterBar solutions={solutions} />
    </div>
  );
}
