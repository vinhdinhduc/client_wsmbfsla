'use client';

import { Package } from '@/types/product';
import { PackageCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { usePackageFilter } from '../_hooks/usePackageFilter';
import styles from './PackageFilterBar.module.scss';

const GROUP_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hot', label: 'Hot' },
  { value: 'tra_truoc', label: 'Trả trước' },
  { value: 'tra_sau', label: 'Trả sau' },
  { value: 'wifi_5g', label: 'Wifi 5G' },
];

export function PackageFilterBar({ packages, simId }: { packages: Package[]; simId?: string }) {
  const { group, setGroup, sort, setSort, filtered } = usePackageFilter(packages);
  const router = useRouter();
  const { addItem } = useCart();
  const simReferenceId = Number(simId);

  function selectPackage(pkg: Package) {
    if (!Number.isInteger(simReferenceId) || simReferenceId <= 0) return;
    addItem({
      key: `goi_cuoc-${pkg.id}`,
      type: 'goi_cuoc',
      reference_id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      image: null,
    });
    router.push('/gio-hang?step=product');
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Tabs tabs={GROUP_TABS} value={group} onChange={(v) => setGroup(v as typeof group)} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className={styles.select}
        >
          <option value="default">Sắp xếp mặc định</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
        </select>
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Không có gói cước phù hợp</p>
        ) : (
          filtered.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onSelect={simId ? () => selectPackage(pkg) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
