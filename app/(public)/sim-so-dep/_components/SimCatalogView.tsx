'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { PublicSimPage } from '@/lib/api/sims';
import { SimCatalogControls } from './SimCatalogControls';
import { SimResultsTable } from './SimResultsTable';
import type { NormalizedSimFilters } from '../_types/sim';
import styles from '../page.module.scss';

export function SimCatalogView({
  filters,
  result,
}: {
  filters: NormalizedSimFilters;
  result: PublicSimPage;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tableRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);
  const [reservedHeight, setReservedHeight] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  function navigate(next: Partial<NormalizedSimFilters>, resetPage = true) {
    const currentHeight = tableRef.current?.getBoundingClientRect().height;
    if (currentHeight) setReservedHeight(currentHeight);
    const updated = {
      ...filtersRef.current,
      ...next,
      page: resetPage ? 1 : (next.page ?? filtersRef.current.page),
    };
    filtersRef.current = updated;
    const params = new URLSearchParams({
      page: String(updated.page),
      pageSize: String(updated.pageSize),
      type: updated.type,
      tab: updated.tab,
    });
    if (updated.q) params.set('q', updated.q);
    if (updated.prefix) params.set('prefix', updated.prefix);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
    requestAnimationFrame(() => {
      const top = tableRef.current?.getBoundingClientRect().top;
      if (top != null) window.scrollTo({ top: top + window.scrollY, behavior: 'smooth' });
    });
  }

  function clearFilters() {
    navigate({ q: '', prefix: '', tab: 'all', type: 'prepaid', pageSize: 20 });
  }

  if (result.total === 0 && !isPending) {
    return (
      <>
        <SimCatalogControls initial={filters} onChange={(next) => navigate(next)} />
        <div className={styles.emptyState}>
          <p>Chưa tìm thấy số phù hợp</p>
          <button type="button" onClick={clearFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <SimCatalogControls initial={filters} onChange={(next) => navigate(next)} />
      <SimResultsTable
        filters={filters}
        hasCommitment={result.hasCommitment}
        isLoading={isPending}
        onPageChange={(page) => navigate({ page }, false)}
        onPageSizeChange={(pageSize) => navigate({ pageSize })}
        result={result}
        reservedHeight={reservedHeight}
        tableRef={tableRef}
      />
    </>
  );
}
