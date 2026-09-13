import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
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
  const packages = await packagesApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Gói cước' }]} />
      <div className={styles.stepper} aria-label="Tiến trình đăng ký">
        <span className={styles.stepDone}>
          <b>1</b> Chọn sim
        </span>
        <span className={styles.stepCurrent}>
          <b>2</b> Chọn gói cước
        </span>
        <span>
          <b>3</b> Thông tin sản phẩm
        </span>
        <span>
          <b>4</b> Thông tin khách hàng
        </span>
      </div>
      <h1 className={styles.title}>Gói cước</h1>
      <PackageFilterBar packages={packages} simId={searchParams.sim_id} />
    </div>
  );
}
