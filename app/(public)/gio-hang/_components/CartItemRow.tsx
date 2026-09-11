'use client';

import { Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { CartItemRowData } from '../_types/cartItem';
import styles from './CartItemRow.module.scss';

const TYPE_LABEL: Record<string, string> = {
  sim: 'Sim số',
  goi_cuoc: 'Gói cước',
  giai_phap: 'Giải pháp',
};

export function CartItemRow({
  item,
  onRemove,
}: {
  item: CartItemRowData;
  onRemove: (key: string) => void;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.meta}>
        <p className={styles.type}>{TYPE_LABEL[item.type]}</p>
        <p className={styles.name}>{item.name}</p>
      </div>
      <div className={styles.side}>
        <p className={styles.price}>{formatPrice(item.price)}</p>
        <button
          type="button"
          onClick={() => onRemove(item.key)}
          aria-label={`Xóa ${item.name}`}
          className={styles.removeButton}
        >
          <Trash2 className={styles.removeIcon} />
        </button>
      </div>
    </div>
  );
}
