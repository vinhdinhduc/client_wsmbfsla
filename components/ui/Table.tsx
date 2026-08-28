'use client';

import { ReactNode, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

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
export function Table<T>({ columns, data, rowKey, isLoading, emptyMessage = 'Không có dữ liệu' }: TableProps<T>) {
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
    <div className="overflow-x-auto rounded-lg border border-neutral-100 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-neutral-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-semibold text-neutral-900',
                  column.sortAccessor && 'cursor-pointer select-none',
                  column.className,
                )}
                onClick={() => handleSort(column)}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header}
                  {column.sortAccessor && sortKey === column.key && (
                    sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-neutral-500">
                <div className="flex flex-col items-center gap-2">
                  <Inbox className="h-8 w-8" />
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-neutral-100/60">
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 text-neutral-900', column.className)}>
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
