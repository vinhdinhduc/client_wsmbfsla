import { Metadata } from 'next';
import { simsApi } from '@/lib/api/sims';
import { SimCatalogControls } from './_components/SimCatalogControls';
import { SimResultsTable } from './_components/SimResultsTable';
import { SimFilterParams } from './_types/sim';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sim số đẹp',
  description: 'Kho sim số đẹp MobiFone Sơn La - lọc theo đầu số, loại sim, mức giá.',
};

export default async function SimsPage({ searchParams }: { searchParams: Promise<SimFilterParams> }) {
  const filters = await searchParams;
  const sims = await simsApi.listPublic(filters);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>CHỌN SIM SỐ ĐẸP</h1>
        <p className={styles.subtitle}>RƯỚC MAY MẮN - ĐÓN TÀI LỘC</p>
        <div className={styles.steps} aria-label="Các bước chọn sim">
          <span className={styles.stepActive}>
            <b>1</b> Chọn sim
          </span>
          <span className={styles.stepSeparator}>›</span>
          <span>
            <b>2</b> Chọn gói cước
          </span>
          <span className={styles.stepSeparator}>›</span>
          <span>
            <b>3</b> Hoàn thành
          </span>
        </div>
      </header>

      <SimCatalogControls initial={filters} />

      {sims.length === 0 ? (
        <p className={styles.emptyText}>Không tìm thấy số phù hợp với bộ lọc</p>
      ) : (
        <SimResultsTable sims={sims} />
      )}
    </div>
  );
}
