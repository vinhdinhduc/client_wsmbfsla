'use client';

import { Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { CartItemRowData } from '../_types/cartItem';

const TYPE_LABEL: Record<string, string> = { sim: 'Sim số', goi_cuoc: 'Gói cước', giai_phap: 'Giải pháp' };

export function CartItemRow({ item, onRemove }: { item: CartItemRowData; onRemove: (key: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-3 last:border-0">
      <div>
        <p className="text-xs text-neutral-500">{TYPE_LABEL[item.type]}</p>
        <p className="font-medium text-neutral-900">{item.name}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-semibold text-accent">{formatPrice(item.price)}</p>
        <button
          type="button"
          onClick={() => onRemove(item.key)}
          aria-label={`Xóa ${item.name}`}
          className="relative text-neutral-500 hover:text-danger before:absolute before:-inset-2 before:content-['']"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
