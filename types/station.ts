export const STATION_STATUSES = {
  active: { label: 'Hoạt động', color: '#16a34a' },
  warning: { label: 'Cảnh báo', color: '#eab308' },
  incident: { label: 'Sự cố', color: '#ef4444' },
  maintenance: { label: 'Bảo trì', color: '#6b7280' },
} as const;
export const STATION_TYPES = ['2G', '3G', '4G', '5G'] as const;
export type StationStatus = keyof typeof STATION_STATUSES;
export type StationType = (typeof STATION_TYPES)[number];

export interface StationInput {
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: StationType;
  status: StationStatus;
  power_watts: number | null;
  coverage_radius_m: number | null;
  installed_at: string | null;
  notes: string | null;
}
export interface Station extends StationInput {
  id: number;
  created_at: string;
  updated_at: string;
}
export interface StationFilters {
  status?: string;
  type?: string;
  search?: string;
  bbox?: string;
}
export interface StationLocation {
  lat: number;
  lng: number;
  label: string;
}
export type NearbyStation = Station & { distance_km: number };
