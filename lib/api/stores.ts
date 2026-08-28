import { apiFetch, ApiFetchOptions } from './client';
import { Store } from '@/types/product';

export interface StoreFormValues {
  name: string;
  address: string;
  district: string;
  phone: string;
  lat: number;
  lng: number;
  opening_hours?: string | null;
}

export const storesApi = {
  listPublic: (district?: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Store[]>('/public/stores', { params: { district }, ...opts }),

  listAdmin: () => apiFetch<Store[]>('/admin/stores'),

  getById: (id: number) => apiFetch<Store>(`/admin/stores/${id}`),

  create: (dto: StoreFormValues) => apiFetch<Store>('/admin/stores', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<StoreFormValues>) =>
    apiFetch<Store>(`/admin/stores/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/stores/${id}`, { method: 'DELETE' }),
};
