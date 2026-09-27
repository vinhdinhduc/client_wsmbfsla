'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Flame,
  Grid2X2,
  PackageOpen,
  Search,
  Smartphone,
} from 'lucide-react';
import { SimCommitment } from '@/components/shared/SimCommitment';
import { SimPurchaseButton } from '@/components/shared/SimPurchaseButton';
import { useCart } from '@/hooks/useCart';
import { PackageBadges, PackageFacts } from '@/components/shared/PackageFacts';
import { packageDuration } from '@/lib/package-display';
import { formatPrice } from '@/lib/format';
import type { Package, PackageGroupType, SimNumber } from '@/types/product';
import styles from './HomeCatalogSections.module.scss';

const PACKAGE_TABS: Array<{ value: PackageGroupType | 'all'; label: string; icon: typeof Flame }> =
  [
    { value: 'all', label: 'Tất cả', icon: Grid2X2 },
    { value: 'hot', label: 'Gói Hot', icon: Flame },
    { value: 'tra_truoc', label: 'Trả trước', icon: Smartphone },
    { value: 'tra_sau', label: 'Trả sau', icon: Smartphone },
  ];

const SIM_TAGS = [
  { value: '', label: 'Tất cả sim số' },
  { value: 'tu_quy', label: 'Tứ quý' },
  { value: 'tam_hoa', label: 'Tam hoa' },
  { value: 'phat_loc', label: 'Lộc phát' },
  { value: 'than_tai', label: 'Thần tài' },
  { value: 'so_dep', label: 'Số đẹp' },
];

export function HomeCatalogSections({
  packages,
  sims,
}: {
  packages: Package[];
  sims: SimNumber[];
}) {
  return (
    <>
      <PackageShowcase packages={packages} />
      <SimShowcase sims={sims} />
    </>
  );
}

function PackageShowcase({ packages }: { packages: Package[] }) {
  const [group, setGroup] = useState<PackageGroupType | 'all'>('all');
  const filtered = packages
    .filter(
      (pkg) =>
        group === 'all' ||
        (group === 'hot'
          ? pkg.badges?.includes('hot')
          : pkg.subscription_type && group !== 'wifi_5g'
            ? pkg.subscription_type === (group === 'tra_truoc' ? 'prepaid' : 'postpaid')
            : pkg.group_type === group),
    )
    .slice(0, 3);

  return (
    <section className={styles.packageSection}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Ưu đãi dành riêng cho bạn</p>
          <h2>Gói cước hấp dẫn</h2>
          <span className={styles.headingLine} />
        </div>
        <Link href="/goi-cuoc" className={styles.viewAll}>
          Xem tất cả <ArrowRight />
        </Link>
      </div>
      <div className={styles.packageTabs} role="tablist" aria-label="Nhóm gói cước">
        {PACKAGE_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={group === value}
            className={`${styles.packageTab} ${group === value ? styles.packageTabActive : ''}`}
            onClick={() => setGroup(value)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>
      <div className={styles.packageGrid}>
        {filtered.map((pkg) => (
          <PackageShowcaseCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
      <div hidden={filtered.length > 0} className={styles.empty}>
        <PackageOpen aria-hidden="true" />
        <p>Nhóm này hiện chưa có gói cước. Bạn hãy khám phá các gói khác nhé!</p>
        <Link href="/goi-cuoc" className={styles.viewAll}>
          Xem tất cả gói cước <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

function PackageShowcaseCard({ pkg }: { pkg: Package }) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(`goi_cuoc-${pkg.id}`);

  return (
    <article className={styles.packageCard}>
      <div className={styles.packageName}>{pkg.name}</div>
      <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.packageBody}>
        <PackageBadges pkg={pkg} />
        {pkg.headline_desc?.trim() && (
          <strong className={styles.packageHeadline}>{pkg.headline_desc}</strong>
        )}
        <PackageFacts pkg={pkg} />
        <div className={styles.packagePrice}>
          {formatPrice(pkg.price)} <span>/ {packageDuration(pkg)}</span>
        </div>
      </Link>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={inCart}
        onClick={() =>
          addItem({
            key: `goi_cuoc-${pkg.id}`,
            type: 'goi_cuoc',
            reference_id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            image: null,
          })
        }
      >
        {inCart ? 'Đã có trong giỏ' : 'Đăng ký ngay'}
      </button>
      <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.detailLink}>
        Xem chi tiết <ArrowRight />
      </Link>
    </article>
  );
}

function SimShowcase({ sims }: { sims: SimNumber[] }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [catalog, setCatalog] = useState('');
  const filtered = useMemo(
    () =>
      sims
        .filter(
          (sim) =>
            sim.status === 'available' &&
            sim.phone_number.includes(query.trim()) &&
            (!catalog || sim.catalog === catalog) &&
            (!tag || sim.sim_type === tag || sim.catalog === tag),
        )
        .slice(0, 12),
    [catalog, query, sims, tag],
  );

  return (
    <section className={styles.simSection}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Chọn số đẹp, chọn khởi đầu mới</p>
          <h2>Sim số MobiFone</h2>
          <span className={styles.headingLine} />
        </div>
        <Link href="/sim-so-dep" className={styles.viewAll}>
          Xem tất cả <ArrowRight />
        </Link>
      </div>
      <div className={styles.simPanel}>
        <div className={styles.simTabs} role="tablist" aria-label="Danh mục sim">
          {[
            ['', 'Tìm sim số đẹp'],
            ['phong_thuy', 'Sim theo phong thủy'],
            ['nam_sinh', 'Sim năm sinh'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={catalog === value}
              className={`${styles.simTab} ${catalog === value ? styles.simTabActive : ''}`}
              onClick={() => setCatalog(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.simFilters}>
          <label className={styles.searchField}>
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập số bạn muốn tìm..."
              aria-label="Tìm sim số"
            />
          </label>
          <label className={styles.selectField}>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              aria-label="Chọn loại sim"
            >
              <option value="">Tất cả loại sim</option>
              {SIM_TAGS.slice(1).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown />
          </label>
        </div>
        <div className={styles.tagRow}>
          {SIM_TAGS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.tag} ${tag === item.value ? styles.tagActive : ''}`}
              onClick={() => setTag(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className={styles.resultCount}>{filtered.length} số phù hợp</p>
        <div className={styles.simGrid}>
          {filtered.map((sim) => (
            <SimShowcaseCard key={sim.id} sim={sim} />
          ))}
        </div>
        {filtered.length === 0 && <p className={styles.empty}>Không tìm thấy số phù hợp.</p>}
      </div>
    </section>
  );
}

function SimShowcaseCard({ sim }: { sim: SimNumber }) {
  return (
    <article className={styles.simCard}>
      <Link href={`/sim-so-dep/${sim.id}`} className={styles.simInfo}>
        <strong>{sim.phone_number}</strong>
        <span className={styles.simPrice}>
          Phí hòa mạng: {formatPrice(sim.activation_fee)} (một lần)
        </span>
        <SimCommitment sim={sim} />
        {sim.bundle_note?.trim() && (
          <div className={styles.simAttributes}>
            {sim.bundle_note
              .split(/[;\r\n]+/)
              .map((note) => note.trim())
              .filter(Boolean)
              .map((note, index) => (
                <span key={index}>{note}</span>
              ))}
          </div>
        )}
      </Link>
      <SimPurchaseButton sim={sim} className={styles.addSim} label={`Chọn số ${sim.phone_number}`}>
        Chọn số này
      </SimPurchaseButton>
    </article>
  );
}
