import { Metadata } from 'next';
import { simsApi } from '@/lib/api/sims';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SimCard } from '@/components/ui/Card';
import { SimFilterPanel } from './_components/SimFilterPanel';
import { SimFilterParams } from './_types/sim';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sim số đẹp',
  description: 'Kho sim số đẹp MobiFone Sơn La - lọc theo đầu số, loại sim, mức giá.',
};

export default async function SimsPage({ searchParams }: { searchParams: SimFilterParams }) {
  const sims = await simsApi.listPublic(searchParams);

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Sim số đẹp' }]} />
      <h1 className={styles.title}>Kho sim số đẹp</h1>

      <div className={styles.layout}>
        <SimFilterPanel initial={searchParams} />

        <div className={styles.content}>
          {sims.length === 0 ? (
            <p className={styles.emptyText}>Không tìm thấy số phù hợp với bộ lọc</p>
          ) : (
            <div className={styles.grid}>
              {sims.map((sim) => (
                <SimCard key={sim.id} sim={sim} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
