'use client';

import { useMemo, useState } from 'react';
import { Store } from '@/types/product';
import { StoreCard } from '@/components/ui/Card';
import styles from './StoreLocatorMap.module.scss';

/** Muc 2 dau bai: Google Maps Embed (iframe) - khong can Maps JavaScript API SDK o giai doan 1. */
export function StoreLocatorMap({ stores }: { stores: Store[] }) {
  const districts = useMemo(
    () => ['all', ...Array.from(new Set(stores.map((s) => s.district)))],
    [stores],
  );
  const [district, setDistrict] = useState('all');

  const filtered = district === 'all' ? stores : stores.filter((s) => s.district === district);
  const focused = filtered[0] ?? stores[0];
  const mapSrc = focused
    ? `https://maps.google.com/maps?q=${focused.lat},${focused.lng}&z=13&output=embed`
    : 'https://maps.google.com/maps?q=Sơn+La&z=11&output=embed';

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className={styles.select}
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'Tất cả các huyện' : d}
            </option>
          ))}
        </select>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>Chưa có điểm bán tại khu vực này</p>
          ) : (
            filtered.map((store) => <StoreCard key={store.id} store={store} />)
          )}
        </div>
      </div>

      <div className={styles.mapWrap}>
        <iframe
          title="Bản đồ điểm bán MobiFone Sơn La"
          src={mapSrc}
          className={styles.map}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
