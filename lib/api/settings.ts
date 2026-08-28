import { apiFetch, ApiFetchOptions } from './client';

export type SettingGroup = 'general' | 'theme' | 'ai' | 'analytics';

export interface Setting {
  id: number;
  key: string;
  value: string;
  group: SettingGroup;
  updated_by: number | null;
  updated_at: string;
}

/**
 * GET /api/public/settings - CHI tra ve dung 6 khoa cong khai co dinh o backend
 * (PUBLIC_SETTING_KEYS): site_name, site_logo, hotline, theme_primary_color,
 * home_banner, ai_chatbot_enabled. Cac khoa khac (vd ga4_id, fb_pixel_id) du co
 * duoc luu qua PUT /admin/settings cung KHONG duoc endpoint nay tra ve.
 */
export interface PublicSettings {
  site_name?: string;
  site_logo?: string;
  hotline?: string;
  theme_primary_color?: string;
  home_banner?: string;
  ai_chatbot_enabled?: string;
}

export const settingsApi = {
  listPublic: (opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<PublicSettings>('/public/settings', opts),

  listAdmin: () => apiFetch<Setting[]>('/admin/settings'),

  update: (group: SettingGroup, items: Array<{ key: string; value: string }>) =>
    apiFetch<Setting[]>('/admin/settings', { method: 'PUT', body: { group, items } }),
};
