'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package } from '@/types/product';
import { FormEvent, useMemo, useState } from 'react';
import { ChevronDown, Grid2X2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { usePackageFilter } from '../_hooks/usePackageFilter';
import { formatPrice } from '@/lib/format';
import { assetUrl } from '@/lib/assets';
import styles from './PackageFilterBar.module.scss';

const GROUP_TABS = [
  { value: 'all', label: 'Tất cả gói cước' },
  { value: 'prepaid', label: 'Trả trước' },
  { value: 'postpaid', label: 'Trả sau' },
  { value: 'data', label: 'Data' },
  { value: 'wifi_5g', label: 'Wifi 5G' },
];

export function PackageFilterBar({ packages, simId }: { packages: Package[]; simId?: string }) {
  const { group, setGroup, sort, setSort, filtered } = usePackageFilter(packages);
  const router = useRouter();
  const { addItem } = useCart();
  const simReferenceId = Number(simId);
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareError, setCompareError] = useState('');
  const toggleCompare = (id: number) => {
    if (compareIds.includes(id)) { setCompareIds(compareIds.filter((value) => value !== id)); setCompareError(''); return; }
    if (compareIds.length >= 3) { setCompareError('Chỉ có thể so sánh tối đa 3 gói.'); return; }
    setCompareIds([...compareIds, id]); setCompareError('');
  };

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
      key: `goi_cuoc-${pkg.id}-sim-${simReferenceId}`,
      type: 'goi_cuoc',
      reference_id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      image: null,
      sim_reference_id: simReferenceId,
    });
    router.push('/gio-hang?step=customer');
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
              isCompared={compareIds.includes(pkg.id)}
              onCompare={() => toggleCompare(pkg.id)}
            />
          ))
        )}
      </div>
      {compareError && <p role="alert">{compareError}</p>}
      {compareIds.length > 0 && <div className={styles.compareWrap}><h2>So sánh gói cước ({compareIds.length}/3)</h2><div className={styles.compareGrid}>{compareIds.map((id) => { const pkg = packages.find((item) => item.id === id); return pkg && <article key={id}><h3>{pkg.name}</h3><p>{formatPrice(pkg.price)}</p><p>Data: {pkg.data_desc || '—'}</p><p>Thoại: {pkg.call_desc || '—'}</p><p>SMS: {pkg.sms_desc || '—'}</p><button type="button" onClick={() => toggleCompare(id)}>Bỏ so sánh</button></article>; })}</div></div>}
    </div>
  );
}

function PackageShowcaseCard({ pkg, onSelect, isCompared, onCompare }: { pkg: Package; onSelect?: () => void; isCompared: boolean; onCompare: () => void }) {
  const { addItem, isInCart } = useCart();
  const key = `goi_cuoc-${pkg.id}`;
  const inCart = isInCart(key);
  const highlight = pkg.data_desc ?? pkg.headline_desc ?? 'Ưu đãi data tốc độ cao';
  const details =
    [pkg.call_desc, pkg.sms_desc, pkg.speed_desc].filter(Boolean).join('; ') ||
    'Kết nối tiện lợi mỗi ngày';

  return (
    <article className={styles.packageCard}>
      {pkg.image_url && <Image className={styles.packageImage} src={assetUrl(pkg.image_url)!} alt={pkg.name} width={400} height={225} sizes="(max-width: 600px) 100vw, 33vw" />}
      <div className={styles.packageName}>{pkg.name}</div>
      <div className={styles.packageContent}>
        {pkg.badges?.length ? <p>{pkg.badges.join(' · ').toUpperCase()}</p> : null}
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
        <button type="button" onClick={onCompare} aria-pressed={isCompared}>{isCompared ? 'Đã chọn so sánh' : 'So sánh'}</button>
        {pkg.sms_syntax && <button type="button" onClick={() => navigator.clipboard.writeText(pkg.sms_syntax!)}>Sao chép cú pháp SMS</button>}
        <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.detailLink}>
          Xem chi tiết <span>›</span>
        </Link>
      </div>
    </article>
  );
}
