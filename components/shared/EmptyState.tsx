import { Inbox, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className={styles.empty} role="status">
      <Icon aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
