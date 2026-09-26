'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          styles.button,
          styles[variant === 'secondary' ? 'outline' : variant],
          styles[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className={styles.loader} aria-hidden />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
