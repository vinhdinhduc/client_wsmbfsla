import { apiFetch, ApiFetchOptions } from './client';
import { Package, PackageGroupType } from '@/types/product';

export interface PackageFormValues {
  code: string;
  name: string;
  slug: string;
  group_type: PackageGroupType;
  headline_desc?: string | null;
  price: number;
  duration_value: number;
  duration_unit: 'ngay' | 'thang';
  data_desc?: string | null;
  call_desc?: string | null;
  sms_desc?: string | null;
  speed_desc?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  display_order: number;
}

export const packagesApi = {
  // ---- Public ----
  listPublic: (groupType?: PackageGroupType, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Package[]>('/public/packages', { params: { group_type: groupType }, ...opts }),

  getPublicBySlug: (slug: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Package>(`/public/packages/${slug}`, opts),

  // ---- Admin ----
  listAdmin: () => apiFetch<Package[]>('/admin/packages'),

  getById: (id: number) => apiFetch<Package>(`/admin/packages/${id}`),

  create: (dto: PackageFormValues) =>
    apiFetch<Package>('/admin/packages', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<PackageFormValues>) =>
    apiFetch<Package>(`/admin/packages/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/packages/${id}`, { method: 'DELETE' }),
};
