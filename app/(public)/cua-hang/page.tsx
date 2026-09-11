import { Metadata } from 'next';
import { storesApi } from '@/lib/api/stores';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StoreLocatorMap } from './_components/StoreLocatorMap';
import styles from './page.module.scss';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Danh sách cửa hàng và điểm bán MobiFone Sơn La theo huyện.',
};

export default async function StoresPage() {
  const stores = await storesApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Cửa hàng' }]} />
      <h1 className={styles.title}>Hệ thống cửa hàng</h1>
      <StoreLocatorMap stores={stores} />
    </div>
  );
}
