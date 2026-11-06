'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Grid2X2,
  PackageOpen,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import { SimCommitment } from '@/components/shared/SimCommitment';
import { SimPurchaseButton } from '@/components/shared/SimPurchaseButton';
import { RegistrationSyntax } from '@/components/shared/RegistrationSyntax';
import { useCart } from '@/hooks/useCart';
import { PackageBadges, PackageFacts } from '@/components/shared/PackageFacts';
import { packageDuration } from '@/lib/package-display';
import { formatPrice } from '@/lib/format';
import { simsApi, type PublicSimPage } from '@/lib/api/sims';
import type { Package, PackageGroupType, SimNumber } from '@/types/product';
import styles from './HomeCatalogSections.module.scss';

const PACKAGE_TABS: Array<{ value: PackageGroupType | 'all'; label: string; icon: typeof Flame }> =
  [
    { value: 'all', label: 'Tất cả', icon: Grid2X2 },
    { value: 'hot', label: 'Gói Hot', icon: Flame },
    { value: 'tra_truoc', label: 'Trả trước', icon: Smartphone },
    { value: 'tra_sau', label: 'Trả sau', icon: Smartphone },
  ];

const SIM_TABS = [
  { value: 'so_dep', label: 'Tìm sim số đẹp' },
  { value: 'phong_thuy', label: 'Sim theo phong thủy' },
  { value: 'nam_sinh', label: 'Sim năm sinh' },
] as const;
type SimTab = (typeof SIM_TABS)[number]['value'];
type SimPattern = 'tam_hoa' | 'tu_quy' | 'phat_loc' | 'than_tai';
type SimFilterTag = SimPattern | 'year4' | 'year2' | 'hop_menh' | '';
const PATTERN_LABELS: Record<SimPattern, string> = {
  tu_quy: 'Tứ quý',
  tam_hoa: 'Tam hoa',
  phat_loc: 'Lộc phát',
  than_tai: 'Thần tài',
};
const ELEMENTS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const;
type Element = (typeof ELEMENTS)[number];
const PAGE_SIZE = 12;

function getBirthYear(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8
    ? digits.slice(-4)
    : digits.length >= 2 && digits.length <= 4
      ? digits
      : '';
}

function getPageNumbers(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  if (page >= totalPages - 2)
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
}

export function HomeCatalogSections({
  packages,
  sims,
  simTotals,
}: {
  packages: Package[];
  sims: SimNumber[];
  simTotals: Record<SimTab, number>;
}) {
  return (
    <>
      <PackageShowcase packages={packages} />
      <SimShowcase sims={sims} simTotals={simTotals} />
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

function SimShowcase({
  sims,
  simTotals,
}: {
  sims: SimNumber[];
  simTotals: Record<SimTab, number>;
}) {
  const availableTabs = useMemo(
    () => SIM_TABS.filter(({ value }) => simTotals[value] > 0),
    [simTotals],
  );
  const tabs = useMemo(
    () => (availableTabs.length > 0 ? availableTabs : [SIM_TABS[0]]),
    [availableTabs],
  );
  const defaultTab = tabs[0]?.value ?? 'so_dep';
  const initialSims = useMemo(
    () =>
      sims
        .filter((sim) => sim.status === 'available' && sim.catalog === defaultTab)
        .slice(0, PAGE_SIZE),
    [defaultTab, sims],
  );
  const [catalog, setCatalog] = useState<SimTab>(defaultTab);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<SimFilterTag>('');
  const [type, setType] = useState<'all' | 'prepaid' | 'postpaid'>('all');
  const [prefix, setPrefix] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [element, setElement] = useState<Element>('Kim');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PublicSimPage>({
    items: initialSims,
    total: simTotals[defaultTab],
    totalPages: Math.max(1, Math.ceil(simTotals[defaultTab] / PAGE_SIZE)),
    page: 1,
    pageSize: PAGE_SIZE,
    page_size: PAGE_SIZE,
    hasCommitment: initialSims.some(
      (sim) => sim.commitment_months != null || sim.committed_monthly_fee != null,
    ),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [requestKey, setRequestKey] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const birthYear = getBirthYear(query);

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get('tab') as SimTab | null;
      const initialTab = tabs.some((item) => item.value === requestedTab)
        ? requestedTab!
        : (tabs[0]?.value ?? 'so_dep');
      setCatalog(initialTab);
      setQuery(params.get('q') ?? '');
      setQueryInput(params.get('q') ?? '');
      setPage(Math.max(1, Number(params.get('page')) || 1));
      setType(
        (['all', 'prepaid', 'postpaid'].includes(params.get('type') ?? '')
          ? params.get('type')
          : 'all') as 'all' | 'prepaid' | 'postpaid',
      );
      setPrefix(params.get('prefix') ?? '');
      setPriceRange(params.get('price') ?? '');
      const requestedFilter = params.get('filter') ?? '';
      setTag(
        (['', 'year4', 'year2', 'hop_menh', ...Object.keys(PATTERN_LABELS)].includes(
          requestedFilter,
        )
          ? requestedFilter
          : '') as SimFilterTag,
      );
      setElement(
        (ELEMENTS.includes(params.get('element') as Element)
          ? params.get('element')
          : 'Kim') as Element,
      );
      setReady(true);
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [tabs]);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    params.set('tab', catalog);
    params.set('page', String(page));
    if (query) params.set('q', query);
    params.set('type', type);
    if (prefix) params.set('prefix', prefix);
    if (priceRange) params.set('price', priceRange);
    if (tag) params.set('filter', tag);
    if (catalog === 'phong_thuy') params.set('element', element);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params.toString()}${window.location.hash}`,
    );
  }, [catalog, element, page, prefix, priceRange, query, ready, tag, type]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    let keepLoading = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      const apiQuery =
        catalog === 'nam_sinh'
          ? birthYear
            ? `*${tag === 'year2' ? birthYear.slice(-2) : birthYear}`
            : undefined
          : query || undefined;
      simsApi
        .listPublicPage(
          {
            catalog,
            q: apiQuery || undefined,
            prefix: prefix || undefined,
            price_range: priceRange || undefined,
            sim_type:
              tag && tag !== 'year2' && tag !== 'year4' && tag !== 'hop_menh' ? tag : undefined,
            element: catalog === 'phong_thuy' ? element : undefined,
            fit_element: catalog === 'phong_thuy' && tag === 'hop_menh',
            type,
            page,
            page_size: PAGE_SIZE,
          },
          controller.signal,
        )
        .then((response) => {
          const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
          if (page > lastPage) {
            keepLoading = true;
            setPage(lastPage);
            return;
          }
          setResult(response);
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể tải danh sách sim. Vui lòng thử lại.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted && !keepLoading) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [birthYear, catalog, element, page, prefix, priceRange, query, ready, requestKey, tag, type]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(queryInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [catalog, queryInput, ready]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const start = result.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, result.total);

  function changeTab(next: SimTab) {
    setCatalog(next);
    setPage(1);
    setQuery('');
    setQueryInput('');
    setTag('');
  }

  function changeFilter(next: () => void) {
    next();
    setPage(1);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  function movePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const currentIndex = tabs.findIndex((tabItem) => tabItem.value === catalog);
    const nextIndex =
      (currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    event.preventDefault();
    changeTab(tabs[nextIndex].value);
    tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  const tags: Array<{ value: SimFilterTag; label: string }> =
    catalog === 'nam_sinh'
      ? [
          { value: '', label: 'Tất cả' },
          { value: 'year4', label: 'Khớp 4 số cuối' },
          { value: 'year2', label: 'Khớp 2 số cuối' },
          { value: 'tu_quy', label: 'Tứ quý' },
        ]
      : catalog === 'phong_thuy'
        ? [
            { value: '', label: 'Tất cả' },
            { value: 'hop_menh', label: 'Số đuôi hợp mệnh' },
            ...Object.entries(PATTERN_LABELS).map(([value, label]) => ({
              value: value as SimPattern,
              label,
            })),
          ]
        : [
            { value: '', label: 'Tất cả' },
            ...Object.entries(PATTERN_LABELS).map(([value, label]) => ({
              value: value as SimPattern,
              label,
            })),
          ];

  return (
    <section className={styles.simSection}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Chọn số đẹp, chọn khởi đầu mới</p>
          <h2>Sim số MobiFone</h2>
          <span className={styles.headingLine} />
        </div>
      </div>
      <div className={styles.simPanel}>
        <div
          ref={tabListRef}
          className={styles.simTabs}
          role="tablist"
          aria-label="Danh mục sim"
          onKeyDown={handleTabKeys}
        >
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`home-sim-tab-${value}`}
              aria-controls="home-sim-panel"
              aria-selected={catalog === value}
              tabIndex={catalog === value ? 0 : -1}
              className={`${styles.simTab} ${catalog === value ? styles.simTabActive : ''}`}
              onClick={() => changeTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div id="home-sim-panel" role="tabpanel" aria-labelledby={`home-sim-tab-${catalog}`}>
          <form className={styles.simFilters} onSubmit={submitSearch}>
            <div className={styles.searchField}>
              <Search />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={
                  catalog === 'nam_sinh'
                    ? 'VD: 1998 hoặc 15/08/1998'
                    : 'Nhập số muốn tìm, VD: 090*, *888, 6868'
                }
                aria-label={catalog === 'nam_sinh' ? 'Năm sinh' : 'Tìm sim số'}
                inputMode={catalog === 'nam_sinh' ? 'numeric' : 'text'}
              />
              {queryInput && (
                <button
                  type="button"
                  className={styles.clearSearch}
                  aria-label="Xóa nội dung tìm kiếm"
                  onClick={() => {
                    setQueryInput('');
                    setQuery('');
                    setPage(1);
                  }}
                >
                  <X />
                </button>
              )}
            </div>
            <label className={styles.selectField} aria-label="Loại thuê bao">
              <select
                value={type}
                onChange={(event) =>
                  changeFilter(() => setType(event.target.value as 'all' | 'prepaid' | 'postpaid'))
                }
                aria-label="Loại sim"
              >
                <option value="all">Loại sim: Tất cả</option>
                <option value="prepaid">Loại sim: Trả trước</option>
                <option value="postpaid">Loại sim: Trả sau</option>
              </select>
              <ChevronDown />
            </label>
            {catalog === 'phong_thuy' ? (
              <label className={styles.selectField}>
                <select
                  value={element}
                  onChange={(event) =>
                    changeFilter(() => setElement(event.target.value as Element))
                  }
                  aria-label="Chọn mệnh"
                >
                  {ELEMENTS.map((item) => (
                    <option key={item} value={item}>
                      Mệnh {item}
                    </option>
                  ))}
                </select>
                <ChevronDown />
              </label>
            ) : null}
            <label className={styles.selectField}>
              <select
                value={priceRange}
                onChange={(event) => changeFilter(() => setPriceRange(event.target.value))}
                aria-label="Khoảng giá"
              >
                <option value="">Khoảng giá: Tất cả</option>
                <option value="0-499999">Dưới 500.000đ</option>
                <option value="500000-1999999">500.000đ – dưới 2 triệu</option>
                <option value="2000000-9999999">2 – dưới 10 triệu</option>
                <option value="10000000-999999999999">Trên 10 triệu</option>
              </select>
              <ChevronDown />
            </label>
            <label className={styles.selectField}>
              <select
                value={prefix}
                onChange={(event) => changeFilter(() => setPrefix(event.target.value))}
                aria-label="Đầu số"
              >
                <option value="">Đầu số: Tất cả</option>
                {['090', '093', '089', '070', '079', '077', '076', '078'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </label>
            <button type="submit" className={styles.simSearchButton}>
              Tìm kiếm
            </button>
          </form>
          <div className={styles.tagRow}>
            {tags.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.tag} ${tag === item.value ? styles.tagActive : ''}`}
                aria-pressed={tag === item.value}
                onClick={() => changeFilter(() => setTag(item.value))}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={styles.resultCount} aria-live="polite">
            Hiển thị {start}–{end} / tổng {result.total} số
          </p>
          <div className={styles.simGrid} ref={gridRef} aria-live="polite" aria-busy={loading}>
            {loading
              ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <div key={index} className={styles.simSkeleton} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ))
              : result.items.map((sim) => <SimShowcaseCard key={sim.id} sim={sim} />)}
          </div>
          {error && (
            <p className={styles.loadError} role="alert">
              {error}{' '}
              <button type="button" onClick={() => setRequestKey((current) => current + 1)}>
                Thử lại
              </button>
            </p>
          )}
          {!loading && !error && result.total === 0 && (
            <div className={styles.empty} role="status">
              <PackageOpen aria-hidden="true" />
              <h3>Chưa tìm thấy số phù hợp</h3>
              <p>Thử rút gọn từ khóa hoặc bỏ bớt bộ lọc.</p>
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => {
                  setQuery('');
                  setQueryInput('');
                  setTag('');
                  setPriceRange('');
                  setPrefix('');
                  setType('all');
                  setElement('Kim');
                  setPage(1);
                }}
              >
                Xóa bộ lọc
              </button>
              <Link href="/lien-he" className={styles.adviceLink}>
                Liên hệ tư vấn
              </Link>
            </div>
          )}
          {result.total > PAGE_SIZE && (
            <nav className={styles.pagination} aria-label="Phân trang danh sách sim">
              <button
                type="button"
                className={styles.pageControl}
                disabled={page === 1 || loading}
                onClick={() => movePage(page - 1)}
              >
                <ChevronLeft aria-hidden="true" /> <span>Trước</span>
              </button>
              <div className={styles.pageNumbers}>
                {getPageNumbers(page, totalPages).map((item, index) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.pageNumber} ${page === item ? styles.pageNumberActive : ''}`}
                      aria-current={page === item ? 'page' : undefined}
                      onClick={() => movePage(item)}
                      disabled={loading}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>
              <span className={styles.mobilePageCount}>
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                className={styles.pageControl}
                disabled={page === totalPages || loading}
                onClick={() => movePage(page + 1)}
              >
                <span>Sau</span> <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          )}
          <div className={styles.simCatalogLink}>
            <Link href="/sim-so-dep" className={styles.allSimsButton}>
              Xem tất cả kho số <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SimShowcaseCard({ sim }: { sim: SimNumber }) {
  const { isInCart } = useCart();
  const selected = isInCart(`sim-${sim.id}`);
  const badgeLabel = PATTERN_LABELS[sim.sim_type as SimPattern];
  const phone = sim.phone_number;
  const formattedPhone =
    phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
  return (
    <article className={`${styles.simCard} ${selected ? styles.simCardSelected : ''}`}>
      <Link href={`/sim-so-dep/${sim.id}`} className={styles.simInfo}>
        <div className={styles.simPhoneRow}>
          <strong aria-label={phone}>
            {formattedPhone.slice(0, -3)}
            <b>{formattedPhone.slice(-3)}</b>
          </strong>
          {badgeLabel && <span className={styles.simBadge}>{badgeLabel}</span>}
        </div>
        {sim.price != null && (
          <span className={styles.simPrice}>Giá sim: {formatPrice(sim.price)}</span>
        )}
        <span className={styles.activationFee}>
          Phí hòa mạng: {formatPrice(sim.activation_fee)}
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
      <SimPurchaseButton
        sim={sim}
        className={styles.addSim}
        label={`Chọn số ${sim.phone_number}`}
        selectedLabel={
          <>
            <Check aria-hidden="true" /> Đã chọn
          </>
        }
      >
        Chọn số này
      </SimPurchaseButton>
    </article>
  );
}
