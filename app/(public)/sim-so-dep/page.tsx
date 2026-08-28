import { Metadata } from 'next';
import { simsApi } from '@/lib/api/sims';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SimCard } from '@/components/ui/Card';
import { SimFilterPanel } from './_components/SimFilterPanel';
import { SimFilterParams } from './_types/sim';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sim số đẹp',
  description: 'Kho sim số đẹp MobiFone Sơn La - lọc theo đầu số, loại sim, mức giá.',
};

export default async function SimsPage({ searchParams }: { searchParams: SimFilterParams }) {
  const sims = await simsApi.listPublic(searchParams);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Sim số đẹp' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Kho sim số đẹp</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <SimFilterPanel initial={searchParams} />

        <div className="flex-1">
          {sims.length === 0 ? (
            <p className="py-16 text-center text-neutral-500">Không tìm thấy số phù hợp với bộ lọc</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
