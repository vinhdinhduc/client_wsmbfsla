'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

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
    <div className={cn('flex gap-1 overflow-x-auto border-b border-neutral-100', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
              isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="tabs-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
