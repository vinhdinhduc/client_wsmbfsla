'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { SimType } from '@/types/product';

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
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold text-neutral-900">Đầu số</h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, prefix: '' })}
            className={`rounded-full border px-3 py-1 text-sm ${value.prefix === '' ? 'border-primary bg-primary text-white' : 'border-neutral-100 text-neutral-900'}`}
          >
            Tất cả
          </button>
          {PREFIXES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...value, prefix: p })}
              className={`rounded-full border px-3 py-1 text-sm ${value.prefix === p ? 'border-primary bg-primary text-white' : 'border-neutral-100 text-neutral-900'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold text-neutral-900">Loại sim</h4>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-neutral-900">
            <input
              type="radio"
              name="sim_type"
              checked={value.sim_type === ''}
              onChange={() => onChange({ ...value, sim_type: '' })}
              className="h-4 w-4 text-primary focus-visible:ring-primary"
            />
            Tất cả
          </label>
          {SIM_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm text-neutral-900">
              <input
                type="radio"
                name="sim_type"
                checked={value.sim_type === t.value}
                onChange={() => onChange({ ...value, sim_type: t.value })}
                className="h-4 w-4 text-primary focus-visible:ring-primary"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold text-neutral-900">Mức giá</h4>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-neutral-900">
              <input
                type="radio"
                name="price_range"
                checked={value.price_range === r.value}
                onChange={() => onChange({ ...value, price_range: r.value })}
                className="h-4 w-4 text-primary focus-visible:ring-primary"
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
      {/* Desktop: cot trai co dinh */}
      <aside className="hidden w-64 shrink-0 rounded-lg border border-neutral-100 bg-white p-4 lg:block">
        <FilterBody value={value} onChange={onChange} />
      </aside>

      {/* Mobile: nut mo Modal/Drawer full-screen */}
      <div className="mb-4 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setIsMobileOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
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
            className="fixed inset-0 z-50 bg-neutral-900/50 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading text-lg font-semibold">Bộ lọc</h3>
                <button type="button" onClick={() => setIsMobileOpen(false)} aria-label="Đóng">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterBody value={value} onChange={onChange} />
              <Button className="mt-4 w-full" onClick={() => setIsMobileOpen(false)}>
                Áp dụng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
