import { Wifi, Phone, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Package } from '@/types/product';
import { packageBadgeLabels, packageData, packageDuration } from '@/lib/package-display';
import styles from './PackageFacts.module.scss';

export function PackageBadges({ pkg }: { pkg: Package }) {
  return (
    <div className={styles.badges}>
      {pkg.badges?.map((badge) => (
        <Badge key={badge} tone="primary">
          {packageBadgeLabels[badge]}
        </Badge>
      ))}
    </div>
  );
}
export function PackageFacts({ pkg }: { pkg: Package }) {
  return (
    <div className={styles.facts}>
      {[
        { icon: Wifi, value: packageData(pkg) },
        { icon: Phone, value: pkg.call_desc?.trim() },
        { icon: Clock, value: packageDuration(pkg) },
      ]
        .filter((item) => item.value)
        .map(({ icon: Icon, value }, index) => (
          <span key={index}>
            <Icon aria-hidden="true" />
            {value}
          </span>
        ))}
    </div>
  );
}
