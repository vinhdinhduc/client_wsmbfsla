'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AiModel } from '@/lib/api/ai';
import styles from './page.module.scss';

const groups = { recommended: 'Khuyến nghị', fast: 'Nhanh & rẻ', powerful: 'Mạnh nhất', other: 'Khác' };
export default function ModelPicker({ models, value, onChange, loading }: { models: AiModel[]; value: string; onChange: (value: string) => void; loading: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const [custom, setCustom] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const visible = Object.keys(groups).flatMap((group) => models.filter((m) => m.group === group && `${m.label} ${m.id}`.toLowerCase().includes(search.toLowerCase())));
  useEffect(() => { setCustom(Boolean(value) && !models.some((m) => m.id === value)); }, [value, models]);
  useEffect(() => { root.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = (index: number) => {
    if (index === visible.length) { setCustom(true); onChange(''); } else { setCustom(false); onChange(visible[index].id); }
    setOpen(false); setSearch(''); input.current?.focus();
  };
  return <div ref={root} className={styles.modelPicker} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>Model</label>
    <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      value={open ? search : value} placeholder="Tìm và chọn model…" onFocus={() => { setOpen(true); setSearch(''); setActive(0); }}
      onChange={(e) => { setSearch(e.target.value); setActive(0); setOpen(true); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); setOpen(true);
          setActive((i) => e.key === 'Home' ? 0 : e.key === 'End' ? visible.length : Math.max(0, Math.min(visible.length, i + (e.key === 'ArrowUp' ? -1 : 1))));
        }
        if (e.key === 'Enter' && open) { e.preventDefault(); choose(Math.min(active, visible.length)); }
      }} />
    {loading && <div className={styles.skeleton} role="status" aria-label="Đang tải danh sách model">Đang lấy danh sách model…</div>}
    {open && <div id={`${id}-list`} role="listbox" aria-label="Danh sách model" className={styles.modelList}>
      {visible.map((m, index) => <div key={m.id}>
        {(index === 0 || visible[index - 1].group !== m.group) && <p className={styles.groupTitle}>{groups[m.group]}</p>}
        <div role="option" id={`${id}-option-${index}`} data-option-index={index} aria-selected={value === m.id} className={active === index ? styles.activeOption : styles.option}
          onMouseDown={(e) => e.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(index)}>
          <strong>{m.label}</strong><small>{m.contextWindow ? `${m.contextWindow.toLocaleString('vi-VN')} token ngữ cảnh` : 'Chưa rõ ngữ cảnh'} · {m.priceInPer1M != null && m.priceOutPer1M != null ? `$${m.priceInPer1M} vào / $${m.priceOutPer1M} ra / 1M token` : 'Chưa có giá xác minh'}</small>
          <span className={styles.chips}>{m.tools && <span className={styles.badge}>Tools</span>}{m.streaming && <span className={styles.badge}>Streaming</span>}{m.source === 'api' && <span className={styles.badge}>Từ API</span>}{m.source === 'api' && !models.find((v) => v.id === m.id && v.verified) && <span className={styles.badge}>Mới</span>}{m.deprecated && <span className={styles.warning}>Sắp ngừng</span>}</span>
        </div>
      </div>)}
      <div id={`${id}-option-${visible.length}`} data-option-index={visible.length} role="option" aria-selected={custom} className={active === visible.length ? styles.activeOption : styles.option} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(visible.length)}>＋ Nhập model khác…</div>
    </div>}
    {custom && <label>Model tùy chỉnh<input autoComplete="off" maxLength={150} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Tên model từ tài khoản nhà cung cấp" /></label>}
  </div>;
}
