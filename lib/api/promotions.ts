import { apiFetch } from './client';

export type PromotionEffect = 'bounce' | 'shake' | 'popup';
export type PromotionPosition = 'center' | 'bottom_right' | 'bottom_left';
export type PromotionTrigger = 'immediate' | 'delay' | 'scroll';
export type PromotionFrequency = 'visit' | 'daily' | 'once';
export type PromotionDevice = 'desktop' | 'mobile' | 'all';
export type PromotionEvent = 'impression' | 'open' | 'cta';

export interface Promotion {
  id: number;
  name: string;
  title: string;
  content: string;
  image_url: string | null;
  coupon_code: string | null;
  cta_text: string | null;
  cta_link: string | null;
  effect_type: PromotionEffect;
  position: PromotionPosition;
  trigger_type: PromotionTrigger;
  trigger_value: number;
  target_pages: string[];
  frequency: PromotionFrequency;
  device: PromotionDevice;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  impression_count: number;
  open_count: number;
  cta_count: number;
  created_at: string;
  updated_at: string;
}

export type PublicPromotion = Omit<Promotion,
  'name' | 'impression_count' | 'open_count' | 'cta_count' | 'created_at' | 'updated_at'>;
export type PromotionInput = Omit<Promotion,
  'id' | 'impression_count' | 'open_count' | 'cta_count' | 'created_at' | 'updated_at'>;

export const promotionsApi = {
  list: () => apiFetch<Promotion[]>('/admin/promotions'),
  get: (id: number) => apiFetch<Promotion>(`/admin/promotions/${id}`),
  create: (values: PromotionInput) => apiFetch<Promotion>('/admin/promotions', {
    method: 'POST', body: values,
  }),
  update: (id: number, values: Partial<PromotionInput>) => apiFetch<Promotion>(`/admin/promotions/${id}`, {
    method: 'PUT', body: values,
  }),
  remove: (id: number) => apiFetch<null>(`/admin/promotions/${id}`, { method: 'DELETE' }),
  listPublic: (path: string, device: Exclude<PromotionDevice, 'all'>, signal?: AbortSignal) =>
    apiFetch<PublicPromotion[]>('/public/promotions', { params: { path, device }, cache: 'no-store', signal }),
  trackEvent: (id: number, event: PromotionEvent, visitId: string) =>
    apiFetch<null>(`/public/promotions/${id}/events`, {
      method: 'POST', body: { event, visit_id: visitId },
    }),
};
