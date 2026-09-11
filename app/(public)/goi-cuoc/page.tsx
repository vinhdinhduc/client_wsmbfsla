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

export default async function PackagesPage() {
  const packages = await packagesApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Gói cước' }]} />
      <h1 className={styles.title}>Gói cước</h1>
      <PackageFilterBar packages={packages} />
    </div>
  );
}
