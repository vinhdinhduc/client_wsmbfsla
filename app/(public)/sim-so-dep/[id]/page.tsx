import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { simsApi } from '@/lib/api/sims';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { AddToCartButton } from '@/components/shared/AddToCartButton';
import { formatPrice } from '@/lib/format';
import { buildMetadata } from '@/lib/metadata';
import styles from './page.module.scss';

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
    <div className={styles.page}>
      <Breadcrumb
        items={[{ label: 'Sim số đẹp', href: '/sim-so-dep' }, { label: sim.phone_number }]}
      />

      <div className={styles.card}>
        <div className={styles.badges}>
          <Badge tone="primary">{SIM_TYPE_LABEL[sim.sim_type] ?? sim.sim_type}</Badge>
          <Badge tone={soldOut ? 'danger' : 'success'}>{soldOut ? 'Hết hàng' : 'Còn hàng'}</Badge>
        </div>
        <h1 className={styles.title}>{sim.phone_number}</h1>
        {sim.bundle_note && <p className={styles.note}>{sim.bundle_note}</p>}
        {sim.commitment_months && (
          <p className={styles.commitment}>Cam kết sử dụng: {sim.commitment_months} tháng</p>
        )}
        <p className={styles.price}>{formatPrice(sim.price)}</p>

        <AddToCartButton
          className={styles.addButton}
          disabled={soldOut}
          item={{
            key: `sim-${sim.id}`,
            type: 'sim',
            reference_id: sim.id,
            name: sim.phone_number,
            price: sim.price,
            image: null,
          }}
        />
        {soldOut && (
          <p className={styles.outOfStock}>Số này hiện đã hết hàng, vui lòng chọn số khác.</p>
        )}
      </div>
    </div>
  );
}
