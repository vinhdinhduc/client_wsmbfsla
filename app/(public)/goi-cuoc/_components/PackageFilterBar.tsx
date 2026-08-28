'use client';

import { Package } from '@/types/product';
import { PackageCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { usePackageFilter } from '../_hooks/usePackageFilter';

const GROUP_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hot', label: 'Hot' },
  { value: 'tra_truoc', label: 'Trả trước' },
  { value: 'tra_sau', label: 'Trả sau' },
  { value: 'wifi_5g', label: 'Wifi 5G' },
];

export function PackageFilterBar({ packages }: { packages: Package[] }) {
  const { group, setGroup, sort, setSort, filtered } = usePackageFilter(packages);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs tabs={GROUP_TABS} value={group} onChange={(v) => setGroup(v as typeof group)} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-10 shrink-0 rounded-lg border border-neutral-100 px-3 text-sm sm:w-52"
        >
          <option value="default">Sắp xếp mặc định</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full py-12 text-center text-neutral-500">Không có gói cước phù hợp</p>
        ) : (
          filtered.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
        )}
      </div>
    </div>
  );
}
