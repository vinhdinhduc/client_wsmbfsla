'use client';

import { useMemo, useState } from 'react';
import { Store } from '@/types/product';
import { StoreCard } from '@/components/ui/Card';

/** Muc 2 dau bai: Google Maps Embed (iframe) - khong can Maps JavaScript API SDK o giai doan 1. */
export function StoreLocatorMap({ stores }: { stores: Store[] }) {
  const districts = useMemo(() => ['all', ...Array.from(new Set(stores.map((s) => s.district)))], [stores]);
  const [district, setDistrict] = useState('all');

  const filtered = district === 'all' ? stores : stores.filter((s) => s.district === district);
  const focused = filtered[0] ?? stores[0];
  const mapSrc = focused
    ? `https://maps.google.com/maps?q=${focused.lat},${focused.lng}&z=13&output=embed`
    : 'https://maps.google.com/maps?q=Sơn+La&z=11&output=embed';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="mb-4 h-10 w-full rounded-lg border border-neutral-100 px-3 text-sm"
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'Tất cả các huyện' : d}
            </option>
          ))}
        </select>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">Chưa có điểm bán tại khu vực này</p>
          ) : (
            filtered.map((store) => <StoreCard key={store.id} store={store} />)
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-100 lg:col-span-3">
        <iframe
          title="Bản đồ điểm bán MobiFone Sơn La"
          src={mapSrc}
          className="h-96 w-full lg:h-full lg:min-h-[500px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
