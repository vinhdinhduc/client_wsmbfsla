'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { useVirtualizer } from '@tanstack/react-virtual';
import { resolveSolutionIcon, searchSolutionIcons, solutionIconGroups, type SolutionIconGroup } from '@/lib/solution-icons';
import styles from './IconPicker.module.scss';

export function IconPicker({ value, onChange }: { value?: string; onChange: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<SolutionIconGroup>('all');
  const [columns, setColumns] = useState(6);
  const listRef = useRef<HTMLDivElement>(null);
  const resolved = resolveSolutionIcon(value);
  const names = useMemo(() => searchSolutionIcons(query, group), [query, group]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(Math.max(1, Math.min(12, Math.floor(entry.contentRect.width / 48))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: Math.ceil(names.length / columns),
    getScrollElement: () => listRef.current,
    estimateSize: () => 50,
    overscan: 4,
  });

  function resetScroll() {
    listRef.current?.scrollTo({ top: 0 });
  }

  return (
    <div className={styles.picker}>
      <div className={styles.current} aria-live="polite">
        {resolved ? <DynamicIcon name={resolved} size={21} fallback={() => <Check size={21} />} /> : <Check size={21} />}
        <span>{resolved ?? (value ? 'Biểu tượng cũ không còn hợp lệ' : 'Chưa chọn biểu tượng')}</span>
        {value && <button type="button" onClick={() => onChange('')} className={styles.clear} aria-label="Bỏ chọn biểu tượng"><X size={16} /></button>}
      </div>
      <label className={styles.search}>
        <Search size={17} aria-hidden />
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetScroll(); }} placeholder="Tìm icon: khóa, chữ ký, lock…" aria-label="Tìm biểu tượng bằng tiếng Việt hoặc tiếng Anh" />
      </label>
      <div className={styles.groups} aria-label="Lọc nhóm biểu tượng">
        {solutionIconGroups.map((item) => <button key={item.value} type="button" onClick={() => { setGroup(item.value); resetScroll(); }} aria-pressed={group === item.value} className={group === item.value ? styles.activeGroup : ''}>{item.label}</button>)}
      </div>
      <p className={styles.count} role="status">{names.length.toLocaleString('vi-VN')} biểu tượng</p>
      <div ref={listRef} className={styles.viewport} aria-label="Danh sách biểu tượng">
        {names.length === 0 ? <p className={styles.empty}>Không tìm thấy biểu tượng phù hợp</p> : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((row) => (
              <div key={row.key} className={styles.row} style={{ transform: `translateY(${row.start}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {names.slice(row.index * columns, (row.index + 1) * columns).map((name) => (
                  <button key={name} type="button" title={name} aria-label={`Chọn biểu tượng ${name}`} aria-pressed={resolved === name} className={resolved === name ? styles.selected : ''} onClick={() => onChange(name)}>
                    <DynamicIcon name={name} size={19} fallback={() => <span className={styles.iconLoading} />} />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
