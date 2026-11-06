import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { simsApi } from '@/lib/api/sims';
import { SimCatalogView } from './_components/SimCatalogView';
import { NormalizedSimFilters, SimSearchParams } from './_types/sim';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sim số đẹp',
  description: 'Kho sim số đẹp MobiFone Sơn La - lọc theo đầu số, loại sim, mức giá.',
};

export default async function SimsPage({ searchParams }: { searchParams: Promise<SimSearchParams> }) {
  const params = await searchParams;
  const value = (input: string | string[] | undefined) =>
    Array.isArray(input) ? input[0] ?? '' : input ?? '';
  const pageValue = value(params.page);
  const pageSizeValue = value(params.pageSize);
  const pageNumber = /^\d+$/.test(pageValue) ? Number(pageValue) : 1;
  const requestedSize = Number(pageSizeValue);
  const pageSize = [10, 20, 50].includes(requestedSize) ? requestedSize : 20;
  const tabValue = value(params.tab);
  const tab = ['so_dep', 'phong_thuy', 'nam_sinh'].includes(tabValue)
    ? (tabValue as NormalizedSimFilters['tab'])
    : 'all';
  const typeValue = value(params.type);
  const type = typeValue === 'prepaid' ? 'prepaid' : 'postpaid';
  const filters: NormalizedSimFilters = {
    page: pageNumber > 0 && Number.isSafeInteger(pageNumber) ? pageNumber : 1,
    pageSize: pageSize as NormalizedSimFilters['pageSize'],
    q: value(params.q).trim(),
    prefix: value(params.prefix),
    tab,
    type,
  };
  const result = await simsApi.listPublic({
    page: filters.page,
    pageSize: filters.pageSize,
    q: filters.q || undefined,
    prefix: filters.prefix || undefined,
    catalog: filters.tab === 'all' ? undefined : filters.tab,
    type: filters.type,
  });

  const needsPageCorrection =
    (pageValue !== '' &&
      (!/^\d+$/.test(pageValue) ||
        !Number.isSafeInteger(Number(pageValue)) ||
        Number(pageValue) !== filters.page)) ||
    (pageSizeValue !== '' && ![10, 20, 50].includes(requestedSize)) ||
    filters.page > result.totalPages;
  if (needsPageCorrection) {
    const corrected = new URLSearchParams({
      page: String(Math.min(filters.page, result.totalPages)),
      pageSize: String(filters.pageSize),
      type: filters.type,
      tab: filters.tab,
    });
    if (filters.q) corrected.set('q', filters.q);
    if (filters.prefix) corrected.set('prefix', filters.prefix);
    redirect(`/sim-so-dep?${corrected.toString()}`);
  }

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

      <SimCatalogView filters={filters} result={result} />
    </div>
  );
}
