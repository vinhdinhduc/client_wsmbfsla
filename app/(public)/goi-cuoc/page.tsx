import { Metadata } from 'next';
import { packagesApi } from '@/lib/api/packages';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PackageFilterBar } from './_components/PackageFilterBar';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Gói cước',
  description: 'Danh sách gói cước MobiFone Sơn La: Hot, Trả trước, Trả sau, Wifi 5G.',
};

export default async function PackagesPage() {
  const packages = await packagesApi.listPublic(undefined, { next: { revalidate: 60 } });

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Gói cước' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Gói cước</h1>
      <PackageFilterBar packages={packages} />
    </div>
  );
}
