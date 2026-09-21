'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Store } from '@/types/product';
import { Ward } from '@/lib/api/stores';
import { StoreCard } from '@/components/ui/Card';
import styles from './StoreLocatorMap.module.scss';

const StorePublicMap = dynamic(() => import('./StorePublicMap').then((module) => module.StorePublicMap), { ssr: false, loading: () => <p>Đang tải bản đồ…</p> });

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLng = toRad(lng2 - lng1);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** Muc 2 dau bai: Google Maps Embed (iframe) - khong can Maps JavaScript API SDK o giai doan 1. */
export function StoreLocatorMap({ stores, wards }: { stores: Store[]; wards: Ward[] }) {
  const wardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    stores.forEach((store) => { if (store.ward_code) counts.set(store.ward_code, (counts.get(store.ward_code) ?? 0) + 1); });
    return counts;
  }, [stores]);
  const [ward, setWard] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  const filtered = (ward === 'all' ? stores : stores.filter((s) => s.ward_code === ward)).sort((a, b) => location ? distanceKm(location.lat, location.lng, Number(a.lat), Number(a.lng)) - distanceKm(location.lat, location.lng, Number(b.lat), Number(b.lng)) : a.id - b.id);
  const focused = filtered.find((store) => store.id === selectedId) ?? filtered[0];

  function findNearMe() {
    if (!navigator.geolocation) { setLocationError('Trình duyệt không hỗ trợ xác định vị trí'); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocationError(''); },
      () => setLocationError('Không lấy được vị trí; vui lòng cấp quyền hoặc chọn xã/phường'),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <select
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className={styles.select}
          aria-label="Lọc cửa hàng theo xã/phường"
        >
          <option value="all">Tất cả xã/phường</option>
          {wards.filter((item) => wardCounts.has(item.code)).map((item) => (
            <option key={item.code} value={item.code}>{item.name_with_type} ({wardCounts.get(item.code)})</option>
          ))}
        </select>
        <button type="button" className={styles.select} onClick={findNearMe}>Gần tôi</button>
        {locationError && <p role="alert" className={styles.empty}>{locationError}</p>}

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>Chưa có điểm bán tại khu vực này</p>
          ) : (
            filtered.map((store) => <StoreCard key={store.id} store={store} selected={focused?.id === store.id} onSelect={() => setSelectedId(store.id)} distanceKm={location ? distanceKm(location.lat, location.lng, Number(store.lat), Number(store.lng)) : undefined} />)
          )}
        </div>
      </div>

      <div className={styles.mapWrap}>
        <StorePublicMap stores={filtered} selected={focused} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
