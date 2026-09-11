'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { SimType } from '@/types/product';
import styles from './FilterSidebar.module.scss';

const PREFIXES = ['090', '093', '089', '070', '079', '077', '076', '078'];
const SIM_TYPES: Array<{ value: SimType; label: string }> = [
  { value: 'tam_hoa', label: 'Tam hoa' },
  { value: 'tu_quy', label: 'Tứ quý' },
  { value: 'phat_loc', label: 'Phát lộc' },
  { value: 'than_tai', label: 'Thần tài' },
  { value: 'thuong', label: 'Thường' },
];
const PRICE_RANGES = [
  { value: '', label: 'Tất cả' },
  { value: '0-500000', label: 'Dưới 500.000đ' },
  { value: '500000-2000000', label: '500.000đ - 2.000.000đ' },
  { value: '2000000-10000000', label: '2.000.000đ - 10.000.000đ' },
  { value: '10000000-999999999', label: 'Trên 10.000.000đ' },
];

export interface SimFilterState {
  prefix: string;
  sim_type: SimType | '';
  price_range: string;
}

interface FilterSidebarProps {
  value: SimFilterState;
  onChange: (value: SimFilterState) => void;
}

function FilterBody({ value, onChange }: FilterSidebarProps) {
  return (
    <div className={styles.filterBody}>
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Đầu số</h4>
        <div className={styles.prefixList}>
          <button
            type="button"
            onClick={() => onChange({ ...value, prefix: '' })}
            className={`${styles.chip} ${value.prefix === '' ? styles.chipActive : ''}`}
          >
            Tất cả
          </button>
          {PREFIXES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...value, prefix: p })}
              className={`${styles.chip} ${value.prefix === p ? styles.chipActive : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Loại sim</h4>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="sim_type"
              checked={value.sim_type === ''}
              onChange={() => onChange({ ...value, sim_type: '' })}
              className={styles.radioInput}
            />
            Tất cả
          </label>
          {SIM_TYPES.map((t) => (
            <label key={t.value} className={styles.radioLabel}>
              <input
                type="radio"
                name="sim_type"
                checked={value.sim_type === t.value}
                onChange={() => onChange({ ...value, sim_type: t.value })}
                className={styles.radioInput}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Mức giá</h4>
        <div className={styles.radioGroup}>
          {PRICE_RANGES.map((r) => (
            <label key={r.value} className={styles.radioLabel}>
              <input
                type="radio"
                name="price_range"
                checked={value.price_range === r.value}
                onChange={() => onChange({ ...value, price_range: r.value })}
                className={styles.radioInput}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FilterSidebar({ value, onChange }: FilterSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      <aside className={styles.desktopSidebar}>
        <FilterBody value={value} onChange={onChange} />
      </aside>

      <div className={styles.mobileToggle}>
        <Button variant="outline" size="sm" onClick={() => setIsMobileOpen(true)}>
          <SlidersHorizontal className={styles.icon} />
          Bộ lọc
        </Button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={styles.mobileOverlay}
            onClick={() => setIsMobileOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={styles.mobilePanel}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.mobileHeader}>
                <h3 className={styles.mobileTitle}>Bộ lọc</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Đóng"
                  className={styles.closeButton}
                >
                  <X className={styles.closeIcon} />
                </button>
              </div>
              <FilterBody value={value} onChange={onChange} />
              <Button className={styles.applyButton} onClick={() => setIsMobileOpen(false)}>
                Áp dụng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
