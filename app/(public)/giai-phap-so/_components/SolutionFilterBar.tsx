'use client';

import { useMemo, useState } from 'react';
import { Solution, SolutionCategory } from '@/types/product';
import { SolutionCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import styles from './SolutionFilterBar.module.scss';

const CATEGORY_TABS: Array<{ value: SolutionCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'sme', label: 'Doanh nghiệp (SME)' },
  { value: 'ubnd', label: 'UBND' },
  { value: 'ho_kinh_doanh', label: 'Hộ kinh doanh' },
  { value: 'cuc_nganh', label: 'Cục / Ngành' },
  { value: 'chuyen_doi_so', label: 'Chuyển đổi số' },
];

export function SolutionFilterBar({ solutions }: { solutions: Solution[] }) {
  const [category, setCategory] = useState<SolutionCategory | 'all'>('all');

  const filtered = useMemo(
    () => (category === 'all' ? solutions : solutions.filter((s) => s.category === category)),
    [solutions, category],
  );

  return (
    <div>
      <Tabs
        tabs={CATEGORY_TABS}
        value={category}
        onChange={(v) => setCategory(v as typeof category)}
      />
      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Chưa có giải pháp trong nhóm này</p>
        ) : (
          filtered.map((s) => <SolutionCard key={s.id} solution={s} />)
        )}
      </div>
    </div>
  );
}
