import { Metadata } from 'next';
import { storesApi } from '@/lib/api/stores';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StoreLocatorMap } from './_components/StoreLocatorMap';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Danh sách cửa hàng và điểm bán MobiFone Sơn La theo xã, phường.',
};

export default async function StoresPage() {
  const [stores, wards] = await Promise.all([
    storesApi.listPublic(undefined, { cache: 'no-store' }).catch(() => []),
    storesApi.listWards().catch(() => []),
  ]);

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Cửa hàng' }]} />
      <h1 className={styles.title}>Hệ thống cửa hàng</h1>
      <StoreLocatorMap stores={stores} wards={wards} />
    </div>
  );
}
