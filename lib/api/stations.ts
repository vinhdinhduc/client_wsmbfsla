import { apiFetch } from './client';
import type {
  NearbyStation,
  Station,
  StationFilters,
  StationInput,
  StationLocation,
} from '@/types/station';

interface StationPage {
  items: Station[];
  total: number;
  page: number;
  limit: number;
}
export const stationsApi = {
  async list(filters: StationFilters = {}): Promise<Station[]> {
    const items: Station[] = [];
    let page = 1;
    let total = 0;
    do {
      const result = await apiFetch<StationPage>('/admin/stations', {
        params: { ...filters, page, limit: 1000 },
        cache: 'no-store',
      });
      items.push(...result.items);
      total = result.total;
      if (result.items.length === 0) break;
      page += 1;
    } while (items.length < total);
    return Array.from(new Map(items.map((station) => [station.id, station])).values());
  },
  create: (body: StationInput) => apiFetch<Station>('/admin/stations', { method: 'POST', body }),
  update: (id: number, body: StationInput) =>
    apiFetch<Station>(`/admin/stations/${id}`, { method: 'PUT', body }),
  remove: (id: number) => apiFetch<null>(`/admin/stations/${id}`, { method: 'DELETE' }),
  geocode: (address: string) =>
    apiFetch<StationLocation | null>('/admin/stations/geocode', { params: { address } }),
  nearest: (location: StationLocation) =>
    apiFetch<NearbyStation[]>('/admin/stations/nearest', {
      params: { latitude: location.lat, longitude: location.lng, limit: 5 },
      cache: 'no-store',
    }),
};
