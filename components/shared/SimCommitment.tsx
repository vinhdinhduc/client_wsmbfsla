import type { SimNumber } from '@/types/product';
import { formatPrice } from '@/lib/format';
import styles from './SimCommitment.module.scss';

export function SimCommitment({ sim }: { sim: SimNumber }) {
  const hasFee = sim.committed_monthly_fee != null && sim.committed_monthly_fee > 0;
  const hasMonths = sim.commitment_months != null && sim.commitment_months > 0;
  if (!hasFee && !hasMonths) return null;
  return (
    <span className={styles.commitment}>
      {hasFee && (
        <>Cam kết {formatPrice(sim.committed_monthly_fee)}/tháng</>
      )}
      {hasFee && hasMonths ? ' x ' : null}
      {hasMonths && `${sim.commitment_months} tháng`}
    </span>
  );
}
