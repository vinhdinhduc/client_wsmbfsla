import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

const toneClasses: Record<BadgeTone, string> = {
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-neutral-100 text-neutral-500',
  primary: 'bg-primary/10 text-primary',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
