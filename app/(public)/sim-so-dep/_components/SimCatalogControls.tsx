'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, Gem, Grid2X2, HelpCircle, ListFilter, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { SimFilterParams } from '../_types/sim';
import styles from '../page.module.scss';

const CATALOGS = [
  { value: '', label: 'Tất cả', icon: Grid2X2 },
  { value: 'so_dep', label: 'Sim số đẹp', icon: Gem },
  { value: 'phong_thuy', label: 'Sim phong thủy', icon: HelpCircle },
  { value: 'nam_sinh', label: 'Sim năm sinh', icon: CalendarDays },
];
const PREFIXES = ['090', '093', '089', '070', '079', '077', '076', '078'];

export function SimCatalogControls({ initial }: { initial: SimFilterParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initial.q ?? '');
  const [selectedType, setSelectedType] = useState(initial.type ?? 'postpaid');

  useEffect(() => { setSelectedType(initial.type ?? 'postpaid'); }, [initial.type]);

  function selectType(type: 'prepaid' | 'postpaid') {
    setSelectedType(type);
    navigate({ type });
  }

  function navigate(next: Partial<SimFilterParams>) {
    const values = { ...initial, ...next };
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: query.trim() });
  }

  return (
    <div className={styles.controls}>
      <div className={styles.catalogTabs} role="tablist" aria-label="Danh mục sim">
        {CATALOGS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={(initial.catalog ?? '') === value}
            className={`${styles.catalogTab} ${(initial.catalog ?? '') === value ? styles.catalogTabActive : ''}`}
            onClick={() => navigate({ catalog: value })}
          >
            <Icon className={styles.controlIcon} />
            {label}
          </button>
        ))}
      </div>

      <form className={styles.searchRow} onSubmit={submit}>
        <label className={styles.searchField}>
          <Search className={styles.searchIcon} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập số cần tìm (VD: *68, 090*)..."
            inputMode="numeric"
            aria-label="Tìm số thuê bao"
          />
        </label>
        <label className={styles.prefixField}>
          <ListFilter className={styles.controlIcon} />
          <select
            value={initial.prefix ?? ''}
            onChange={(event) => navigate({ prefix: event.target.value })}
            aria-label="Chọn đầu số"
          >
            <option value="">Chọn đầu số</option>
            {PREFIXES.map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.searchButton}>
          Tìm kiếm
        </button>
      </form>

      <div className={styles.paymentChoice} role="group" aria-label="Hình thức thanh toán">
        <label>
          <input
            type="radio"
            name="subscription-type"
            value="postpaid"
            checked={selectedType === 'postpaid'}
            onChange={() => selectType('postpaid')}
          />
          Trả sau
        </label>
        <label>
          <input
            type="radio"
            name="subscription-type"
            value="prepaid"
            checked={selectedType === 'prepaid'}
            onChange={() => selectType('prepaid')}
          />
          Trả trước
        </label>
      </div>
    </div>
  );
}
