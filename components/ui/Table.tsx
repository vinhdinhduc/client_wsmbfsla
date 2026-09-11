'use client';

import { ReactNode, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import styles from './Table.module.scss';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortAccessor?: (row: T) => string | number;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Bang du lieu dung chung cho toan bo /admin/* (muc 7 dau bai) - tu sap xep
 * theo cot khi cot co sortAccessor. Phan trang xu ly rieng boi <Pagination />
 * o tang page (server-driven) hoac component cha (client-driven).
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = 'Không có dữ liệu',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortAccessor) return data;
    const accessor = column.sortAccessor;
    return [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  function handleSort(column: TableColumn<T>) {
    if (!column.sortAccessor) return;
    if (sortKey === column.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead className={styles.head}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  styles.headerCell,
                  column.sortAccessor && styles.sortable,
                  column.className,
                )}
                onClick={() => handleSort(column)}
              >
                <span className={styles.headerContent}>
                  {column.header}
                  {column.sortAccessor &&
                    sortKey === column.key &&
                    (sortDir === 'asc' ? (
                      <ChevronUp className={styles.sortIcon} />
                    ) : (
                      <ChevronDown className={styles.sortIcon} />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.body}>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCellLarge}>
                <div className={styles.emptyContent}>
                  <Inbox className={styles.emptyIcon} />
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr key={rowKey(row)} className={styles.row}>
                {columns.map((column) => (
                  <td key={column.key} className={cn(styles.cell, column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
