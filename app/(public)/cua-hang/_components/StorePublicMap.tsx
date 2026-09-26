'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Store } from '@/types/product';

export function StorePublicMap({
  stores,
  selected,
  onSelect,
}: {
  stores: Store[];
  selected?: Store;
  onSelect: (id: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const selectStore = useRef(onSelect);
  const center = selected ?? stores[0];
  const initialCenter = useRef<L.LatLngTuple>(
    center ? [Number(center.lat), Number(center.lng)] : [21.3256, 103.9188],
  );

  useEffect(() => {
    selectStore.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!container.current) return;
    // Pair initialization and cleanup in one effect, including Strict Mode's replay.
    // The installed react-leaflet callback ref can initialize a reattached node twice.
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView(
      initialCenter.current,
      12,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance);
    map.current = instance;
    markers.current = L.layerGroup().addTo(instance);
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    const icon = L.divIcon({
      className: 'store-map-marker',
      html: '<span aria-hidden="true"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    stores.forEach((store) => {
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = store.name;
      popup.append(
        title,
        document.createElement('br'),
        document.createTextNode(store.full_address ?? store.address ?? ''),
      );
      L.marker([Number(store.lat), Number(store.lng)], { icon })
        .bindPopup(popup)
        .on('click', () => selectStore.current(store.id))
        .addTo(layer);
    });
    return () => {
      layer.clearLayers();
    };
  }, [stores]);

  useEffect(() => {
    if (selected)
      map.current?.flyTo([Number(selected.lat), Number(selected.lng)], 15, { duration: 0.2 });
  }, [selected]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Bản đồ cửa hàng MobiFone Sơn La"
      style={{ height: '100%', minHeight: 400, width: '100%' }}
    />
  );
}
