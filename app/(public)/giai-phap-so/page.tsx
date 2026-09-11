import { Metadata } from 'next';
import { solutionsApi } from '@/lib/api/solutions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SolutionFilterBar } from './_components/SolutionFilterBar';
import styles from './page.module.scss';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Giải pháp số',
  description:
    'Giải pháp số MobiFone Sơn La cho Doanh nghiệp (SME), UBND, Hộ kinh doanh và Cục/Ngành.',
};

export default async function SolutionsPage() {
  const solutions = await solutionsApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Giải pháp số' }]} />
      <h1 className={styles.title}>Giải pháp số</h1>
      <SolutionFilterBar solutions={solutions} />
    </div>
  );
}
