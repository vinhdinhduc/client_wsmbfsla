import { Metadata } from 'next';
import { storesApi } from '@/lib/api/stores';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StoreLocatorMap } from './_components/StoreLocatorMap';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Danh sách cửa hàng và điểm bán MobiFone Sơn La theo huyện.',
};

export default async function StoresPage() {
  const stores = await storesApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Cửa hàng' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Hệ thống cửa hàng</h1>
      <StoreLocatorMap stores={stores} />
    </div>
  );
}
