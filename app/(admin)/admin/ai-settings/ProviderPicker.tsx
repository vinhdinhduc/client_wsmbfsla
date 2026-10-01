'use client';

import { useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { AiProfile, AiProviderDefinition } from '@/lib/api/ai';
import styles from './page.module.scss';

const categories = {
  native: 'API gốc',
  openai_compatible: 'Tương thích OpenAI',
  aggregator: 'Tổng hợp',
  fast_inference: 'Suy luận nhanh',
};
export function ProviderAvatar({ name, id }: { name: string; id: string }) {
  const hue = [...id].reduce((sum, c) => sum + c.charCodeAt(0) * 17, 0) % 360;
  return (
    <span
      className={styles.avatar}
      style={{ backgroundColor: `hsl(${hue} 45% 30%)` }}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
export default function ProviderPicker({
  providers,
  profiles,
  selected,
  onSelect,
}: {
  providers: AiProviderDefinition[];
  profiles: AiProfile[];
  selected: string;
  onSelect: (p: AiProviderDefinition) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [configured, setConfigured] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const visible = providers.filter(
    (p) =>
      (!category || p.category === category) &&
      `${p.name} ${p.tagline}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) &&
      (!configured || profiles.some((f) => f.provider === p.id && f.has_api_key)),
  );
  return (
    <div className={styles.picker}>
      <label className={styles.search}>
        <Search size={18} aria-hidden="true" />
        <input
          aria-label="Tìm nhà cung cấp"
          placeholder="Tìm nhà cung cấp…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className={styles.chips} aria-label="Lọc nhà cung cấp">
        <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>
          Tất cả ({providers.length})
        </button>
        {Object.entries(categories).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" aria-pressed={configured} onClick={() => setConfigured(!configured)}>
          Đã cấu hình
        </button>
      </div>
      <div
        className={styles.providerGrid}
        ref={grid}
        role="group"
        aria-label="Nhà cung cấp"
        onKeyDown={(e) => {
          if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key))
            return;
          const buttons = [...(grid.current?.querySelectorAll<HTMLButtonElement>('button') || [])];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const columns = getComputedStyle(grid.current!).gridTemplateColumns.split(' ').length;
          const step =
            e.key === 'ArrowDown'
              ? columns
              : e.key === 'ArrowUp'
                ? -columns
                : e.key === 'ArrowLeft'
                  ? -1
                  : 1;
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? buttons.length - 1
                : Math.max(0, Math.min(buttons.length - 1, index + step));
          e.preventDefault();
          buttons[next]?.focus();
        }}
      >
        {visible.map((p) => {
          const configuredProfiles = profiles.filter((f) => f.provider === p.id);
          return (
            <button
              type="button"
              className={styles.providerCard}
              key={p.id}
              aria-pressed={selected === p.id}
              onClick={() => onSelect(p)}
            >
              <span className={styles.cardTop}>
                <ProviderAvatar name={p.name} id={p.id} />
                {selected === p.id && <Check size={18} aria-label="Đang chọn" />}
              </span>
              <strong>{p.name}</strong>
              <span className={styles.tagline} title={p.tagline}>
                {p.tagline}
              </span>
              <span className={styles.badge}>{categories[p.category]}</span>
              {configuredProfiles.some((f) => f.api_key_error) ? (
                <small className={styles.warning}>● Cần nhập lại key</small>
              ) : configuredProfiles.some((f) => f.has_api_key) ? (
                <small className={styles.success}>● Đã cấu hình</small>
              ) : null}
            </button>
          );
        })}
      </div>
      {!visible.length && <p role="status">Không tìm thấy nhà cung cấp phù hợp.</p>}
    </div>
  );
}
