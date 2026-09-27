import type { SimNumber } from '@/types/product';
import { formatPrice } from '@/lib/format';
import styles from './SimCommitment.module.scss';

export function SimCommitment({ sim }: { sim: SimNumber }) {
  if (sim.subscription_type !== 'postpaid' || sim.committed_monthly_fee == null) return null;
  return (
    <span className={styles.commitment}>
      Cam kết gói cước tối thiểu {formatPrice(sim.committed_monthly_fee)}/tháng
      {sim.commitment_months ? ` x ${sim.commitment_months} tháng` : ''}
    </span>
  );
}
