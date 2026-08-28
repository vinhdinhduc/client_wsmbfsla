'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { FilterSidebar, SimFilterState } from '@/components/shared/FilterSidebar';
import { SimFilterParams } from '../_types/sim';

export function SimFilterPanel({ initial }: { initial: SimFilterParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState<SimFilterState>({
    prefix: initial.prefix ?? '',
    sim_type: initial.sim_type ?? '',
    price_range: initial.price_range ?? '',
  });

  function handleChange(next: SimFilterState) {
    setValue(next);
    const params = new URLSearchParams();
    if (next.prefix) params.set('prefix', next.prefix);
    if (next.sim_type) params.set('sim_type', next.sim_type);
    if (next.price_range) params.set('price_range', next.price_range);
    // push -> Next.js goi lai Server Component (SSR) voi query string moi (muc 12 dau bai)
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return <FilterSidebar value={value} onChange={handleChange} />;
}
