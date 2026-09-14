'use client';

import Link from 'next/link';
import { Package } from '@/types/product';
import { FormEvent, useMemo, useState } from 'react';
import { ChevronDown, Grid2X2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { usePackageFilter } from '../_hooks/usePackageFilter';
import { formatPrice } from '@/lib/format';
import styles from './PackageFilterBar.module.scss';

const GROUP_TABS = [
  { value: 'all', label: 'Tất cả gói cước' },
  { value: 'hot', label: 'Gói Hot' },
  { value: 'tra_truoc', label: 'Trả trước' },
  { value: 'tra_sau', label: 'Trả sau' },
  { value: 'wifi_5g', label: 'Data' },
];

export function PackageFilterBar({ packages, simId }: { packages: Package[]; simId?: string }) {
  const { group, setGroup, sort, setSort, filtered } = usePackageFilter(packages);
  const router = useRouter();
  const { addItem } = useCart();
  const simReferenceId = Number(simId);
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('');

  const visiblePackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return filtered.filter((pkg) => {
      const matchesQuery =
        !normalizedQuery ||
        `${pkg.name} ${pkg.code} ${pkg.headline_desc ?? ''}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesPrice =
        !priceFilter ||
        (priceFilter === 'under-150'
          ? pkg.price < 150000
          : priceFilter === '150-300'
            ? pkg.price >= 150000 && pkg.price <= 300000
            : pkg.price > 300000);
      return matchesQuery && matchesPrice;
    });
  }, [filtered, priceFilter, query]);

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.searchBox} onSubmit={submitSearch}>
        <label className={styles.searchInput}>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập tên gói cước (VD: PT90, KC120)..."
            aria-label="Tìm tên gói cước"
          />
        </label>
        <label className={styles.priceSelect}>
          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value)}
            aria-label="Lọc theo mức giá"
          >
            <option value="">Tất cả mức giá</option>
            <option value="under-150">Dưới 150.000đ</option>
            <option value="150-300">150.000đ - 300.000đ</option>
            <option value="over-300">Trên 300.000đ</option>
          </select>
          <ChevronDown />
        </label>
        <button type="submit" className={styles.searchButton}>
          <Search /> Tìm kiếm
        </button>
      </form>

      <div className={styles.tabs} role="tablist" aria-label="Nhóm gói cước">
        {GROUP_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={group === tab.value}
            className={`${styles.tab} ${group === tab.value ? styles.tabActive : ''}`}
            onClick={() => setGroup(tab.value as typeof group)}
          >
            {tab.value === 'all' && <Grid2X2 />} {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.resultHeader}>
        <h2>
          Kết quả tìm kiếm <span>({visiblePackages.length} gói cước)</span>
        </h2>
        <label className={styles.sortSelect}>
          <span>Sắp xếp:</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sắp xếp gói cước"
          >
            <option value="default">Mặc định</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
        </label>
      </div>

      <div className={styles.grid}>
        {visiblePackages.length === 0 ? (
          <p className={styles.empty}>Không có gói cước phù hợp</p>
        ) : (
          visiblePackages.map((pkg) => (
            <PackageShowcaseCard
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

function PackageShowcaseCard({ pkg, onSelect }: { pkg: Package; onSelect?: () => void }) {
  const { addItem, isInCart } = useCart();
  const key = `goi_cuoc-${pkg.id}`;
  const inCart = isInCart(key);
  const highlight = pkg.data_desc ?? pkg.headline_desc ?? 'Ưu đãi data tốc độ cao';
  const details =
    [pkg.call_desc, pkg.sms_desc, pkg.speed_desc].filter(Boolean).join('; ') ||
    'Kết nối tiện lợi mỗi ngày';

  return (
    <article className={styles.packageCard}>
      <div className={styles.packageName}>{pkg.name}</div>
      <div className={styles.packageContent}>
        <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.packageLink}>
          <strong className={styles.packageHighlight}>{highlight}</strong>
          <p>{details}</p>
          <div className={styles.packagePrice}>
            {formatPrice(pkg.price)}{' '}
            <span>
              / {pkg.duration_value} {pkg.duration_unit}
            </span>
          </div>
        </Link>
        <button
          type="button"
          className={styles.registerButton}
          disabled={inCart}
          onClick={() => {
            if (onSelect) return onSelect();
            addItem({
              key,
              type: 'goi_cuoc',
              reference_id: pkg.id,
              name: pkg.name,
              price: pkg.price,
              image: null,
            });
          }}
        >
          {inCart ? 'Đã thêm' : 'ĐĂNG KÝ'}
        </button>
        <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.detailLink}>
          Xem chi tiết <span>›</span>
        </Link>
      </div>
    </article>
  );
}
