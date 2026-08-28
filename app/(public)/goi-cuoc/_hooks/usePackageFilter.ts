'use client';

import { useMemo, useState } from 'react';
import { Package } from '@/types/product';
import { PackageFilterState, PackageSortOption } from '../_types/package';

export function usePackageFilter(allPackages: Package[]) {
  const [group, setGroup] = useState<PackageFilterState>('all');
  const [sort, setSort] = useState<PackageSortOption>('default');

  const filtered = useMemo(() => {
    let result = group === 'all' ? allPackages : allPackages.filter((p) => p.group_type === group);
    if (sort === 'price_asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [allPackages, group, sort]);

  return { group, setGroup, sort, setSort, filtered };
}
