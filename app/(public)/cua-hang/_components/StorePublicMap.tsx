'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Store } from '@/types/product';

function SelectedStore({ store }: { store?: Store }) {
  const map = useMap();
  useEffect(() => {
    if (store) map.flyTo([Number(store.lat), Number(store.lng)], 15, { duration: 0.2 });
  }, [map, store]);
  return null;
}

export function StorePublicMap({ stores, selected, onSelect }: { stores: Store[]; selected?: Store; onSelect: (id: number) => void }) {
  const icon = useMemo(() => L.divIcon({ className: 'store-map-marker', html: '<span aria-hidden="true"></span>', iconSize: [24, 24], iconAnchor: [12, 12] }), []);
  const center = selected ?? stores[0];
  return (
    <MapContainer center={center ? [Number(center.lat), Number(center.lng)] : [21.3256, 103.9188]} zoom={12} style={{ height: '100%', minHeight: 400, width: '100%' }} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <SelectedStore store={selected} />
      {stores.map((store) => <Marker key={store.id} position={[Number(store.lat), Number(store.lng)]} icon={icon} eventHandlers={{ click: () => onSelect(store.id) }}>
        <Popup><strong>{store.name}</strong><br />{store.full_address ?? store.address}</Popup>
      </Marker>)}
    </MapContainer>
  );
}
