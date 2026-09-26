import type { ReactNode } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import styles from './FilterBar.module.scss';

export function FilterBar({
  children,
  label = 'Bộ lọc',
  onReset,
}: {
  children: ReactNode;
  label?: string;
  onReset?: () => void;
}) {
  return (
    <section className={styles.panel} aria-label={label}>
      <div className={styles.heading}>
        <span>
          <SlidersHorizontal size={16} aria-hidden="true" />
          {label}
        </span>
        {onReset && (
          <button type="button" onClick={onReset}>
            <RotateCcw size={14} aria-hidden="true" />
            Xóa bộ lọc
          </button>
        )}
      </div>
      <div className={styles.controls}>{children}</div>
    </section>
  );
}
