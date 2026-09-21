import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { PackageFilterBar } from './_components/PackageFilterBar';
import styles from './page.module.scss';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Gói cước',
  description: 'Danh sách gói cước MobiFone Sơn La: Hot, Trả trước, Trả sau, Wifi 5G.',
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: { sim_id?: string };
}) {
  const packages = await packagesApi
    .listPublic(undefined, { next: { revalidate: 60 } })
    .catch(() => []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>MobiFone Sơn La</p>
        <h1 className={styles.title}>
          KHÁM PHÁ VŨ TRỤ DATA
          <br />
          LƯỚT NET THẢ GA KHÔNG LO VỀ GIÁ
        </h1>
        <p className={styles.subtitle}>Chọn gói cước phù hợp cho nhu cầu kết nối mỗi ngày.</p>
      </section>
      <PackageFilterBar packages={packages} simId={searchParams.sim_id} />
    </div>
  );
}
