'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { SimCommitment } from '@/components/shared/SimCommitment';
import { SimPurchaseButton } from '@/components/shared/SimPurchaseButton';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/format';
import type { PublicSimPage } from '@/lib/api/sims';
import type { NormalizedSimFilters } from '../_types/sim';
import styles from '../page.module.scss';

const PAGE_SIZES = [10, 20, 50] as const;

export function SimResultsTable({
  result,
  filters,
  hasCommitment,
  isLoading,
  onPageChange,
  onPageSizeChange,
  reservedHeight,
  tableRef,
}: {
  result: PublicSimPage;
  filters: NormalizedSimFilters;
  hasCommitment: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: NormalizedSimFilters['pageSize']) => void;
  reservedHeight: number | null;
  tableRef: RefObject<HTMLDivElement>;
}) {
  const { isInCart } = useCart();
  const start = result.total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const end = Math.min(filters.page * filters.pageSize, result.total);
  const pages = visiblePages(filters.page, result.totalPages);

  return (
    <>
      <div
        aria-busy={isLoading}
        className={styles.tableWrap}
        ref={tableRef}
        style={isLoading && reservedHeight ? { minHeight: reservedHeight } : undefined}
      >
        {isLoading ? (
          <div className={styles.loadingRows} role="status" aria-label="Đang tải danh sách sim">
            {Array.from({ length: 6 }, (_, index) => (
              <div className={styles.loadingRow} key={index}>
                <span />
                <span />
                <span />
                {hasCommitment && <span />}
                <span />
              </div>
            ))}
          </div>
        ) : (
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th scope="col">STT</th>
                <th scope="col">Số thuê bao</th>
                <th scope="col">Phí hòa mạng</th>
                {hasCommitment && <th scope="col">Cam kết gói cước</th>}
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((sim, index) => {
                const key = `sim-${sim.id}`;
                const selected = isInCart(key);
                return (
                  <tr key={sim.id}>
                    <td data-label="STT">{(filters.page - 1) * filters.pageSize + index + 1}</td>
                    <td>
                      <Link href={`/sim-so-dep/${sim.id}`} className={styles.phoneLink}>
                        {sim.phone_number}
                      </Link>
                    </td>
                    <td data-label="Phí hòa mạng">{formatPrice(sim.activation_fee)}</td>
                    {hasCommitment && (
                      <td data-label="Cam kết gói cước">
                        <SimCommitment sim={sim} />
                      </td>
                    )}
                    <td>
                      <SimPurchaseButton
                        sim={sim}
                        className={`${styles.chooseButton} ${selected ? styles.chooseButtonSelected : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.paginationBar}>
        <p className={styles.resultRange}>
          Hiển thị {start}–{end} / {result.total} số
        </p>
        <nav aria-label="Phân trang" className={styles.pagination}>
          <button
            aria-label="Trang trước"
            className={styles.pageButton}
            disabled={isLoading || filters.page <= 1}
            onClick={() => onPageChange(filters.page - 1)}
            type="button"
          >
            <span className={styles.desktopLabel}>‹ Trước</span>
            <span className={styles.mobileLabel}>‹</span>
          </button>
          <div className={styles.pageNumbers}>
            {pages.map((item, index) =>
              item === '…' ? (
                <span aria-hidden="true" className={styles.ellipsis} key={`ellipsis-${index}`}>
                  …
                </span>
              ) : (
                <button
                  aria-current={item === filters.page ? 'page' : undefined}
                  aria-label={`Trang ${item}`}
                  className={`${styles.pageNumber} ${item === filters.page ? styles.currentPage : ''}`}
                  disabled={isLoading}
                  key={item}
                  onClick={() => onPageChange(item)}
                  type="button"
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <span aria-live="polite" className={styles.mobilePageLabel}>
            Trang {filters.page}/{result.totalPages}
          </span>
          <button
            aria-label="Trang sau"
            className={styles.pageButton}
            disabled={isLoading || filters.page >= result.totalPages}
            onClick={() => onPageChange(filters.page + 1)}
            type="button"
          >
            <span className={styles.desktopLabel}>Sau ›</span>
            <span className={styles.mobileLabel}>›</span>
          </button>
        </nav>
        <label className={styles.pageSizeField}>
          Số dòng/trang
          <select
            aria-label="Số số hiển thị mỗi trang"
            disabled={isLoading}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as NormalizedSimFilters['pageSize'])
            }
            value={filters.pageSize}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function visiblePages(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  const pages: Array<number | '…'> = [1];
  if (start > 2) pages.push('…');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}
