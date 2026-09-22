import { apiFetch, ApiFetchOptions } from './client';

export type SliderAnimationType = 'fade' | 'slide' | 'zoom';
export type SliderStatus = 'active' | 'inactive';

export interface SliderZone {
  id: number;
  code: string;
  name: string;
  animation_type: SliderAnimationType;
  autoplay_enabled: boolean;
  autoplay_speed_ms: number;
  status: SliderStatus;
}

export interface SliderItem {
  id: number;
  zone_id: number;
  image_url: string;
  mobile_image_url?: string | null;
  alt_text?: string | null;
  open_new_tab?: boolean;
  image_width?: number | null;
  image_height?: number | null;
  image_bytes?: number | null;
  person_name?: string | null;
  job_title?: string | null;
  rating?: number | null;
  link_url: string | null;
  title: string | null;
  caption: string | null;
  display_order: number;
  status: SliderStatus;
  effective_status?: 'active' | 'scheduled' | 'expired' | 'hidden';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface PublicSliderZone {
  animation_type: SliderAnimationType;
  autoplay_enabled: boolean;
  autoplay_speed_ms: number;
  items: SliderItem[];
}

export interface SliderZoneUpdateValues {
  name?: string;
  animation_type?: SliderAnimationType;
  autoplay_enabled?: boolean;
  autoplay_speed_ms?: number;
  status?: SliderStatus;
}

export interface SliderItemFormValues {
  zone_id: number;
  image_url?: string;
  mobile_image_url?: string | null;
  alt_text?: string | null;
  open_new_tab?: boolean;
  person_name?: string | null;
  job_title?: string | null;
  rating?: number | null;
  image?: File;
  mobile_image?: File;
  link_url?: string | null;
  title?: string | null;
  caption?: string | null;
  display_order: number;
  status: SliderStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export const slidersApi = {
  // ---- Public ----
  getByZoneCode: (zoneCode: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<PublicSliderZone>(`/public/sliders/${zoneCode}`, opts),

  // ---- Admin ----
  listZones: () => apiFetch<SliderZone[]>('/admin/sliders/zones'),

  updateZone: (id: number, dto: SliderZoneUpdateValues) =>
    apiFetch<SliderZone>(`/admin/sliders/zones/${id}`, { method: 'PUT', body: dto }),

  listItems: (zoneId: number) =>
    apiFetch<SliderItem[]>('/admin/sliders/items', { params: { zone_id: zoneId } }),

  createItem: (dto: SliderItemFormValues) =>
    apiFetch<SliderItem>('/admin/sliders/items', {
      method: 'POST',
      body: toFormData(dto),
      isFormData: true,
    }),

  updateItem: (id: number, dto: Partial<SliderItemFormValues>) =>
    apiFetch<SliderItem>(`/admin/sliders/items/${id}`, {
      method: 'PUT',
      body: toFormData(dto),
      isFormData: true,
    }),

  removeItem: (id: number) => apiFetch<null>(`/admin/sliders/items/${id}`, { method: 'DELETE' }),
};

function toFormData(values: Partial<SliderItemFormValues>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && key !== 'image' && key !== 'mobile_image') {
      formData.append(key, value === null ? '' : String(value));
    }
  });
  if (values.image) formData.append('image', values.image);
  if (values.mobile_image) formData.append('mobile_image', values.mobile_image);
  return formData;
}
