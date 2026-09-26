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
            <th scope="col">STT</th>
            <th scope="col">Số thuê bao</th>
            <th scope="col">Phí hòa mạng</th>
            <th scope="col">Thời gian cam kết</th>
            <th scope="col">Thao tác</th>
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
                <td data-label="Phí hòa mạng">{formatPrice(sim.activation_fee)}</td>
                <td data-label="Cam kết">
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
                          price: sim.activation_fee,
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
