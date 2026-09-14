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
 * GET /api/public/settings - CHI tra ve cac khoa cong khai co dinh o backend
 * (PUBLIC_SETTING_KEYS): site_name, site_logo, hotline, theme_primary_color,
 * home_banner, ai_chatbot_enabled, footer_branch_name, footer_address,
 * footer_email, footer_description, footer_facebook_url. Cac khoa khac (vd ga4_id, fb_pixel_id) du co
 * duoc luu qua PUT /admin/settings cung KHONG duoc endpoint nay tra ve.
 */
export interface PublicSettings {
  site_name?: string;
  site_logo?: string;
  hotline?: string;
  theme_primary_color?: string;
  home_banner?: string;
  ai_chatbot_enabled?: string;
  footer_branch_name?: string;
  footer_address?: string;
  footer_email?: string;
  footer_description?: string;
  footer_facebook_url?: string;
  footer_about_title?: string;
  footer_about_content?: string;
  footer_phone?: string;
  footer_working_hours?: string;
  footer_zalo_url?: string;
  footer_youtube_url?: string;
  footer_copyright?: string;
  contact_widget_message?: string;
  contact_widget_enabled?: string;
  ga4_id?: string;
  fb_pixel_id?: string;
}

export const settingsApi = {
  listPublic: (opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<PublicSettings>('/public/settings', opts),

  listAdmin: () => apiFetch<Setting[]>('/admin/settings'),

  update: (group: SettingGroup, items: Array<{ key: string; value: string }>) =>
    apiFetch<Setting[]>('/admin/settings', { method: 'PUT', body: { group, items } }),
};
