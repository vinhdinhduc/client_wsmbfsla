'use client';

import { Trash2 } from 'lucide-react';
import { formatPrice, toPriceNumber } from '@/lib/format';
import type { CartItemRowData } from '../_types/cartItem';
import styles from './CartItemRow.module.scss';

const TYPE_LABEL: Record<string, string> = {
  sim: 'Sim số',
  goi_cuoc: 'Gói cước',
  giai_phap: 'Giải pháp',
};

export function CartItemRow({
  item,
  packageItem,
  onRemove,
}: {
  item: CartItemRowData;
  packageItem?: CartItemRowData;
  onRemove: (key: string) => void;
}) {
  const setupFee = toPriceNumber(item.price);
  const packagePrice = toPriceNumber(packageItem?.price);

  return (
    <div className={styles.row}>
      <div className={styles.meta}>
        <p className={styles.type}>{TYPE_LABEL[item.type]}</p>
        <p className={styles.name}>{item.name}</p>
      </div>
      <span className={styles.subscription}>{item.type === 'sim' ? 'Trả sau' : 'Gói cước'}</span>
      <span className={styles.setupFee}>{formatPrice(setupFee)}</span>
      <span className={styles.packagePrice}>{packageItem ? formatPrice(packagePrice) : '-'}</span>
      <div className={styles.side}>
        <p className={styles.price}>{formatPrice(setupFee + packagePrice)}</p>
        <button
          type="button"
          onClick={() => {
            onRemove(item.key);
            if (packageItem) onRemove(packageItem.key);
          }}
          aria-label={`Xóa ${item.name}`}
          className={styles.removeButton}
        >
          <Trash2 className={styles.removeIcon} />
        </button>
      </div>
    </div>
  );
}
