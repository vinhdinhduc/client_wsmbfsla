'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';
import type { SimNumber } from '@/types/product';
import styles from '../page.module.scss';

export function SimResultsTable({ sims }: { sims: SimNumber[] }) {
  const { addItem, isInCart } = useCart();
  const router = useRouter();

  return (
    <div className={styles.tableWrap}>
      <table className={styles.resultsTable}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Số thuê bao</th>
            <th>Phí hòa mạng</th>
            <th>Thời gian cam kết</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sims.map((sim, index) => {
            const key = `sim-${sim.id}`;
            const selected = isInCart(key);
            return (
              <tr key={sim.id}>
                <td>{index + 1}</td>
                <td>
                  <Link href={`/sim-so-dep/${sim.id}`} className={styles.phoneLink}>
                    {sim.phone_number}
                  </Link>
                </td>
                <td>{formatPrice(sim.price)}</td>
                <td>
                  {sim.commitment_months ? `${sim.commitment_months} tháng` : 'Không cam kết'}
                </td>
                <td>
                  <button
                    type="button"
                    className={`${styles.chooseButton} ${selected ? styles.chooseButtonSelected : ''}`}
                    disabled={selected}
                    onClick={() =>
                      (() => {
                        addItem({
                          key,
                          type: 'sim',
                          reference_id: sim.id,
                          name: sim.phone_number,
                          price: sim.price,
                          image: null,
                        });
                        router.push(`/goi-cuoc?sim_id=${sim.id}`);
                      })()
                    }
                  >
                    {selected ? 'Đã chọn' : 'Chọn số'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
