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
  status: 'active' | 'inactive' | 'hidden';
  display_order: number;
  service_type?: 'mobile' | 'data' | 'wifi_5g' | 'combo';
  subscription_type?: 'prepaid' | 'postpaid' | 'none';
  badges?: Array<'hot' | 'new' | 'bestseller'>;
  sms_syntax?: string | null;
  image_url?: string | null;
  image?: File;
  conditions?: string | null;
  audience?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  data_per_day_gb?: number | null;
  data_per_cycle_gb?: number | null;
  unlimited_data?: boolean;
  benefits?: string[] | null;
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
    apiFetch<Package>('/admin/packages', packageRequest('POST', dto)),

  update: (id: number, dto: Partial<PackageFormValues>) =>
    apiFetch<Package>(`/admin/packages/${id}`, packageRequest('PUT', dto)),

  remove: (id: number) => apiFetch<null>(`/admin/packages/${id}`, { method: 'DELETE' }),
};

function packageRequest(method: 'POST' | 'PUT', dto: Partial<PackageFormValues>) {
  if (!dto.image) return { method, body: dto };
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && key !== 'image') form.append(key, value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  form.append('image', dto.image);
  return { method, body: form, isFormData: true };
}
