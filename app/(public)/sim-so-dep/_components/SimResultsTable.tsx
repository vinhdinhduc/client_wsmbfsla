'use client';

import Link from 'next/link';
import { SimCommitment } from '@/components/shared/SimCommitment';
import { SimPurchaseButton } from '@/components/shared/SimPurchaseButton';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';
import type { SimNumber } from '@/types/product';
import styles from '../page.module.scss';

export function SimResultsTable({ sims }: { sims: SimNumber[] }) {
  const { isInCart } = useCart();

  return (
    <div className={styles.tableWrap}>
      <table className={styles.resultsTable}>
        <thead>
          <tr>
            <th scope="col">STT</th>
            <th scope="col">Số thuê bao</th>
            <th scope="col">Phí hòa mạng</th>
            <th scope="col">Cam kết gói cước</th>
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
                <td data-label="Phí hòa mạng">{formatPrice(sim.activation_fee)} (một lần)</td>
                <td data-label="Cam kết">
                  <SimCommitment sim={sim} />
                </td>
                <td>
                  <SimPurchaseButton
                    sim={sim}
                    className={`${styles.chooseButton} ${selected ? styles.chooseButtonSelected : ''}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
