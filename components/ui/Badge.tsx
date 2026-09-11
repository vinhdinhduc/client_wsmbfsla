import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './Badge.module.scss';

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cn(styles.badge, styles[tone])}>{children}</span>;
}
