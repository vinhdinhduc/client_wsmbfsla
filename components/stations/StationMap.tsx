'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TileLayer, useMap } from 'react-leaflet';
import { createLeafletContext, LeafletProvider } from '@react-leaflet/core';
import { STATION_STATUSES, type Station, type StationLocation } from '@/types/station';
import styles from './Stations.module.scss';

export interface StationMapProps {
  stations: Station[];
  coverage: boolean;
  heatmap: boolean;
  defaultRadius: number;
  focus: { station: Station; sequence: number } | null;
  location: StationLocation | null;
  onBounds: (bbox: string) => void;
}

/** Pair init/cleanup in one effect: react-leaflet v4's MapContainer callback
 * ref can initialize the same node twice under Next 15's Strict Mode replay. */
function StationMapContainer({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<ReturnType<typeof createLeafletContext> | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      minZoom: 3,
      maxZoom: 19,
      scrollWheelZoom: true,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
    }).setView([21.3256, 103.9188], 9);
    setContext(createLeafletContext(map));
    return () => {
      map.remove();
    };
  }, []);
  return (
    <div ref={container} className={styles.map}>
      {context && <LeafletProvider value={context}>{children}</LeafletProvider>}
    </div>
  );
}

function popup(station: Station) {
  const element = document.createElement('div');
  element.className = styles.popup;
  const heading = document.createElement('strong');
  heading.textContent = `${station.code} · ${station.name}`;
  element.append(heading);
  const details = [
    ['Địa chỉ', station.address],
    ['Loại trạm', station.type],
    ['Trạng thái', STATION_STATUSES[station.status].label],
    ['Công suất', station.power_watts == null ? 'Chưa cập nhật' : `${station.power_watts} W`],
    ['Ngày lắp đặt', station.installed_at ?? 'Chưa cập nhật'],
    ['Ghi chú', station.notes || '—'],
  ];
  details.forEach(([label, value]) => {
    const line = document.createElement('p');
    // Text nodes ensure station names/notes never become executable HTML.
    line.textContent = `${label}: ${value}`;
    element.append(line);
  });
  return element;
}

function Layers({
  stations,
  coverage,
  heatmap,
  defaultRadius,
  focus,
  location,
  onBounds,
}: StationMapProps) {
  const map = useMap();
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<number, L.Marker>());
  const handledFocus = useRef<number | null>(null);
  const fittedInitially = useRef(false);

  useEffect(() => {
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 48,
    });
    const indexed = new Map<number, L.Marker>();
    stations.forEach((station) => {
      const color = STATION_STATUSES[station.status].color;
      const marker = L.marker([station.latitude, station.longitude], {
        title: `${station.code} · ${station.name} · ${STATION_STATUSES[station.status].label}`,
        icon: L.divIcon({
          className: styles.marker,
          html: `<span style="background:${color}"></span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).bindPopup(popup(station), { maxWidth: 320 });
      indexed.set(station.id, marker);
    });
    group.addLayers(Array.from(indexed.values()));
    map.addLayer(group);
    markers.current = indexed;
    cluster.current = group;
    if (!fittedInitially.current && stations.length > 0) {
      map.fitBounds(L.latLngBounds(stations.map((station) => [station.latitude, station.longitude])), {
        padding: [40, 40],
        maxZoom: 11,
        animate: false,
      });
      fittedInitially.current = true;
    }
    return () => {
      group.clearLayers();
      map.removeLayer(group);
      cluster.current = null;
      markers.current.clear();
    };
  }, [map, stations]);

  useEffect(() => {
    if (!focus || handledFocus.current === focus.sequence) return;
    const marker = markers.current.get(focus.station.id);
    const group = cluster.current;
    if (!marker || !group) return;
    handledFocus.current = focus.sequence;
    const show = () =>
      group.zoomToShowLayer(marker, () => {
        if (map.hasLayer(group)) marker.openPopup();
      });
    map.once('moveend', show);
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.7 });
    // flyTo may emit no moveend when already at the destination.
    const timer = window.setTimeout(show, 900);
    return () => {
      map.off('moveend', show);
      window.clearTimeout(timer);
    };
  }, [focus, map, stations]);

  useEffect(() => {
    if (!coverage) return;
    const layer = L.layerGroup(
      stations.map((station) =>
        L.circle([station.latitude, station.longitude], {
          radius: station.coverage_radius_m ?? defaultRadius,
          color: STATION_STATUSES[station.status].color,
          weight: 1,
          fillOpacity: 0.08,
          interactive: false,
        }),
      ),
    ).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, stations, coverage, defaultRadius]);

  useEffect(() => {
    if (!heatmap) return;
    const layer = L.heatLayer(
      stations.map(
        (station) => [station.latitude, station.longitude, 1] as [number, number, number],
      ),
      {
        radius: 30,
        blur: 22,
        maxZoom: 13,
        max: 1,
        minOpacity: 0.25,
      },
    ).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, stations, heatmap]);

  useEffect(() => {
    if (!location) return;
    const marker = L.marker([location.lat, location.lng], {
      title: 'Vị trí tìm kiếm',
      icon: L.divIcon({
        className: styles.locationMarker,
        html: '<span>◎</span>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    }).addTo(map);
    const label = document.createElement('span');
    label.textContent = location.label;
    marker.bindPopup(label).openPopup();
    map.flyTo([location.lat, location.lng], 12);
    return () => {
      map.removeLayer(marker);
    };
  }, [map, location]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const bounds = map.getBounds();
        const west = Math.max(-180, bounds.getWest());
        const east = Math.min(180, bounds.getEast());
        onBounds(
          [west, Math.max(-90, bounds.getSouth()), east, Math.min(90, bounds.getNorth())]
            .map((value) => value.toFixed(6))
            .join(','),
        );
      }, 300);
    };
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    map.on('moveend', report);
    report();
    return () => {
      clearTimeout(timer);
      map.off('moveend', report);
      observer.disconnect();
    };
  }, [map, onBounds]);
  return null;
}

export default function StationMap(props: StationMapProps) {
  const [tileError, setTileError] = useState(false);
  return (
    <div className={styles.mapWrap}>
      {tileError && (
        <p className={styles.tileError} role="status">
          Không tải được một số ô bản đồ. Kiểm tra kết nối mạng.
        </p>
      )}
      <StationMapContainer>
        <TileLayer
          noWrap
          url={
            process.env.NEXT_PUBLIC_STATION_TILE_URL ||
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution={
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <Layers {...props} />
      </StationMapContainer>
    </div>
  );
}
