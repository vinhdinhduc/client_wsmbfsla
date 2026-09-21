'use client';

import { useEffect, useMemo, useRef } from 'react';
import L, { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

type Position = { lat: number; lng: number };

function MapInteractions({ position, onChange }: { position: Position; onChange: (position: Position) => void }) {
  const map = useMap();
  useEffect(() => { map.flyTo([position.lat, position.lng], map.getZoom(), { animate: false }); }, [map, position.lat, position.lng]);
  useMapEvents({ click: (event: LeafletMouseEvent) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export function MapPicker({ position, onChange }: { position: Position; onChange: (position: Position) => void }) {
  const marker = useRef<LeafletMarker | null>(null);
  const icon = useMemo(() => L.divIcon({ className: 'store-map-marker', html: '<span aria-hidden="true"></span>', iconSize: [24, 24], iconAnchor: [12, 12] }), []);
  return (
    <div style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' }} aria-label="Bản đồ chọn vị trí cửa hàng">
      <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapInteractions position={position} onChange={onChange} />
        <Marker position={[position.lat, position.lng]} icon={icon} draggable ref={marker} eventHandlers={{ dragend: () => {
          const next = marker.current?.getLatLng();
          if (next) onChange({ lat: next.lat, lng: next.lng });
        } }} />
      </MapContainer>
    </div>
  );
}
