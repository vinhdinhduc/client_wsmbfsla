import { apiFetch, ApiFetchOptions } from './client';
import { Store } from '@/types/product';

export interface StoreFormValues {
  name: string;
  street_address: string;
  ward_code: string;
  phone: string;
  email?: string | null;
  lat: number;
  lng: number;
  opening_hours_json: Array<{ days: number[]; open: string; close: string }>;
  status: 'active' | 'inactive';
  geocode_source?: 'map' | 'address' | 'manual' | null;
}

export interface Ward { code: string; name_with_type: string }

export const storesApi = {
  listPublic: (ward_code?: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Store[]>('/public/stores', { params: { ward_code }, ...opts }),

  listWards: () => apiFetch<Ward[]>('/public/wards'),

  geocode: (address: string) => apiFetch<{ lat: number; lng: number; label: string; source: string } | null>('/admin/stores/geocode', { params: { address } }),

  listAdmin: () => apiFetch<Store[]>('/admin/stores'),

  getById: (id: number) => apiFetch<Store>(`/admin/stores/${id}`),

  create: (dto: StoreFormValues) => apiFetch<Store>('/admin/stores', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<StoreFormValues>) =>
    apiFetch<Store>(`/admin/stores/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/stores/${id}`, { method: 'DELETE' }),
};
