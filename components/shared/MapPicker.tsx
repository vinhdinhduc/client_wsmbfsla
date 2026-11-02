'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import L, { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';
import { Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { createLeafletContext, LeafletProvider } from '@react-leaflet/core';

type Position = { lat: number; lng: number };

function MapInteractions({ position, onChange }: { position: Position; onChange: (position: Position) => void }) {
  const map = useMap();
  useEffect(() => { map.flyTo([position.lat, position.lng], map.getZoom(), { animate: false }); }, [map, position.lat, position.lng]);
  useMapEvents({ click: (event: LeafletMouseEvent) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export function MapPicker({ position, onChange }: { position: Position; onChange: (position: Position) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const initialPosition = useRef(position);
  const [context, setContext] = useState<ReturnType<typeof createLeafletContext> | null>(null);
  const marker = useRef<LeafletMarker | null>(null);
  const icon = useMemo(() => L.divIcon({ className: 'store-map-marker', html: '<span aria-hidden="true"></span>', iconSize: [24, 24], iconAnchor: [12, 12] }), []);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [initialPosition.current.lat, initialPosition.current.lng],
      15,
    );
    setContext(createLeafletContext(map));
    return () => {
      map.remove();
    };
  }, []);

  return (
    <div ref={container} style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' }} aria-label="Bản đồ chọn vị trí cửa hàng">
      {context && (
        <LeafletProvider value={context}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapInteractions position={position} onChange={onChange} />
          <Marker position={[position.lat, position.lng]} icon={icon} draggable ref={marker} eventHandlers={{ dragend: () => {
            const next = marker.current?.getLatLng();
            if (next) onChange({ lat: next.lat, lng: next.lng });
          } }} />
        </LeafletProvider>
      )}
    </div>
  );
}
