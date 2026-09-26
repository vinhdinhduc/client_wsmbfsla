import { Blocks, Package, CardSim, Wifi } from 'lucide-react';
import type { CartItemType } from '@/types/order';
import styles from './CartProductIcon.module.scss';

const ICONS = { sim: CardSim, goi_cuoc: Wifi, giai_phap: Blocks, solution_plan: Package };

export function CartProductIcon({ type }: { type: CartItemType }) {
  const Icon = ICONS[type] ?? Package;
  return (
    <span className={`${styles.icon} ${styles[type]}`} aria-hidden="true">
      <Icon />
    </span>
  );
}
