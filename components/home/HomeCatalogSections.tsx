'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Flame, Grid2X2, PackageOpen, Smartphone } from 'lucide-react';
import { RegistrationSyntax } from '@/components/shared/RegistrationSyntax';
import { useCart } from '@/hooks/useCart';
import { PackageBadges, PackageFacts } from '@/components/shared/PackageFacts';
import { packageDuration } from '@/lib/package-display';
import { formatPrice } from '@/lib/format';
import { simsApi, type PublicSimPage } from '@/lib/api/sims';
import { SimCatalogControls } from '@/app/(public)/sim-so-dep/_components/SimCatalogControls';
import { SimResultsTable } from '@/app/(public)/sim-so-dep/_components/SimResultsTable';
import type { NormalizedSimFilters } from '@/app/(public)/sim-so-dep/_types/sim';
import type { Package, PackageGroupType } from '@/types/product';
import styles from './HomeCatalogSections.module.scss';

const PACKAGE_TABS: Array<{ value: PackageGroupType | 'all'; label: string; icon: typeof Flame }> =
  [
    { value: 'all', label: 'Tất cả', icon: Grid2X2 },
    { value: 'hot', label: 'Gói Hot', icon: Flame },
    { value: 'tra_truoc', label: 'Trả trước', icon: Smartphone },
    { value: 'tra_sau', label: 'Trả sau', icon: Smartphone },
  ];

export function HomeCatalogSections({
  packages,
  initialSimFilters,
}: {
  packages: Package[];
  initialSimFilters: NormalizedSimFilters;
}) {
  return (
    <>
      <PackageShowcase packages={packages} />
      <SimShowcase initialFilters={initialSimFilters} />
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
      {filtered.length === 0 && (
        <div className={styles.empty}>
          <PackageOpen aria-hidden="true" />
          <p>Nhóm này hiện chưa có gói cước. Bạn hãy khám phá các gói khác nhé!</p>
          <Link href="/goi-cuoc" className={styles.viewAll}>
            Xem tất cả gói cước <ArrowRight />
          </Link>
        </div>
      )}
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
      </Link>
      <div className={styles.packageSyntax}>
        <RegistrationSyntax
          syntax={pkg.registerSyntax}
          shortcode={pkg.registerShortcode}
          reserveSpace
        />
      </div>
      <Link href={`/goi-cuoc/${pkg.slug}`} className={styles.packagePrice}>
        {formatPrice(pkg.price)} <span>/ {packageDuration(pkg)}</span>
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

function SimShowcase({ initialFilters }: { initialFilters: NormalizedSimFilters }) {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState<PublicSimPage>({
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    pageSize: 10,
    page_size: 10,
    hasCommitment: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    simsApi
      .listPublicPage(
        {
          catalog: filters.tab === 'all' ? undefined : filters.tab,
          q: filters.q || undefined,
          prefix: filters.prefix || undefined,
          type: filters.type,
          page: 1,
          page_size: 10,
        },
        controller.signal,
      )
      .then(setResult)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải danh sách sim. Vui lòng thử lại.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters.prefix, filters.q, filters.tab, filters.type, requestKey]);

  function updateFilters(next: Partial<NormalizedSimFilters>) {
    setFilters((current) => ({ ...current, ...next, page: 1 }));
  }

  function clearFilters() {
    setFilters({
      ...initialFilters,
      q: '',
      prefix: '',
      tab: 'all',
      type: 'prepaid',
      page: 1,
      pageSize: 10,
    });
  }

  const catalogHref = (() => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '10',
      tab: filters.tab,
      type: filters.type,
    });
    if (filters.q) params.set('q', filters.q);
    if (filters.prefix) params.set('prefix', filters.prefix);
    return `/sim-so-dep?${params.toString()}`;
  })();

  useEffect(() => {
    const params = new URLSearchParams({
      tab: filters.tab,
      page: '1',
      type: filters.type,
    });
    if (filters.q) params.set('q', filters.q);
    if (filters.prefix) params.set('prefix', filters.prefix);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params.toString()}${window.location.hash}`,
    );
  }, [filters]);

  return (
    <section className={styles.simSection}>
      <header className={styles.simHeading}>
        <h2>CHỌN SIM SỐ ĐẸP</h2>
        <p>Rước may mắn - Đón tài lộc</p>
        <span className={styles.headingLine} />
        <div className={styles.simSteps} aria-label="Các bước chọn sim">
          <span className={styles.simStepActive}>1. Chọn sim</span>
          <span>2. Chọn gói cước</span>
          <span>3. Hoàn thành</span>
        </div>
      </header>

      <SimCatalogControls initial={filters} onChange={updateFilters} />

      {error ? (
        <div className={styles.simError} role="alert">
          <p>Không thể tải danh sách sim: {error}</p>
          <button type="button" onClick={() => setRequestKey((current) => current + 1)}>
            Thử lại
          </button>
        </div>
      ) : result.total === 0 && !loading ? (
        <div className={styles.simEmpty} role="status">
          <p>Không tìm thấy số phù hợp, thử rút gọn từ khóa hoặc đổi đầu số</p>
          <button type="button" onClick={clearFilters}>
            Xóa bộ lọc
          </button>
          <Link href="/lien-he">Liên hệ tư vấn</Link>
        </div>
      ) : (
        <SimResultsTable
          compact
          filters={filters}
          hasCommitment={false}
          isLoading={loading}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          result={result}
          reservedHeight={null}
          tableRef={tableRef}
        />
      )}

      <div className={styles.simCatalogLink}>
        <Link href={catalogHref} className={styles.allSimsButton}>
          Xem tất cả kho số <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
