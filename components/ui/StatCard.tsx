import type { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.scss';

type StatCardTone = 'blue' | 'orange' | 'green' | 'purple';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: StatCardTone;
}) {
  return (
    <article className={styles.card}>
      <div className={`${styles.iconWrap} ${styles[tone]}`}>
        <Icon className={styles.icon} aria-hidden="true" />
      </div>
      <div className={styles.content}>
        <p className={styles.value}>{value}</p>
        <p className={styles.label}>{label}</p>
      </div>
    </article>
  );
}
