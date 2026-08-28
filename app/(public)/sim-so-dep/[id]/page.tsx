import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { simsApi } from '@/lib/api/sims';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { AddToCartButton } from '@/components/shared/AddToCartButton';
import { formatPrice } from '@/lib/format';
import { buildMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

const SIM_TYPE_LABEL: Record<string, string> = {
  tam_hoa: 'Tam hoa',
  tu_quy: 'Tứ quý',
  phat_loc: 'Phát lộc',
  than_tai: 'Thần tài',
  thuong: 'Thường',
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const sim = await simsApi.getPublicById(Number(params.id));
    return buildMetadata({ title: `Sim ${sim.phone_number}`, path: `/sim-so-dep/${sim.id}` });
  } catch {
    return buildMetadata({ title: 'Sim số đẹp', path: `/sim-so-dep/${params.id}` });
  }
}

export default async function SimDetailPage({ params }: { params: { id: string } }) {
  let sim;
  try {
    sim = await simsApi.getPublicById(Number(params.id));
  } catch {
    notFound();
  }
  const soldOut = sim.status !== 'available';

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Sim số đẹp', href: '/sim-so-dep' }, { label: sim.phone_number }]} />

      <div className="mx-auto mt-6 max-w-xl rounded-lg border border-neutral-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <Badge tone="primary">{SIM_TYPE_LABEL[sim.sim_type] ?? sim.sim_type}</Badge>
          <Badge tone={soldOut ? 'danger' : 'success'}>{soldOut ? 'Hết hàng' : 'Còn hàng'}</Badge>
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-wide text-neutral-900 sm:text-4xl">
          {sim.phone_number}
        </h1>
        {sim.bundle_note && <p className="mt-3 text-neutral-500">{sim.bundle_note}</p>}
        {sim.commitment_months && (
          <p className="mt-1 text-sm text-neutral-500">Cam kết sử dụng: {sim.commitment_months} tháng</p>
        )}
        <p className="mt-4 font-body text-3xl font-bold text-accent">{formatPrice(sim.price)}</p>

        <AddToCartButton
          className="mt-6 w-full"
          disabled={soldOut}
          item={{ key: `sim-${sim.id}`, type: 'sim', reference_id: sim.id, name: sim.phone_number, price: sim.price, image: null }}
        />
        {soldOut && <p className="mt-2 text-center text-sm text-danger">Số này hiện đã hết hàng, vui lòng chọn số khác.</p>}
      </div>
    </div>
  );
}
