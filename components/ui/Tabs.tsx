'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import styles from './Tabs.module.scss';

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn(styles.tabs, className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(styles.tab, isActive ? styles.active : styles.inactive)}
          >
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="tabs-underline"
                className={styles.underline}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
