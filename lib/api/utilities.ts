import { apiFetch } from './client';

export interface Utility {
  id: number;
  name: string;
  slug: string;
  summary: string | null;
  card_image: string | null;
  hero_image: string | null;
  content: string | null;
  features: string[] | null;
  ios_url: string | null;
  android_url: string | null;
  website_url: string | null;
  cta_type: 'download' | 'website' | 'call';
  cta_label: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
}

export interface Download {
  id: number;
  title: string;
  category: string;
  file_url: string;
  description: string | null;
  download_count: number;
  sort_order?: number;
  status?: 'active' | 'inactive';
}

export const utilitiesApi = {
  list: (limit?: number) =>
    apiFetch<Utility[]>('/public/utilities', { params: { limit }, next: { revalidate: 60 } }),
  detail: (slug: string) =>
    apiFetch<Utility>(`/public/utilities/${slug}`, { next: { revalidate: 60 } }),
  downloads: () => apiFetch<Download[]>('/public/downloads', { next: { revalidate: 60 } }),
  adminList: () => apiFetch<Utility[]>('/admin/utilities'),
  adminDownloads: () => apiFetch<Download[]>('/admin/utilities/downloads'),
  create: (body: Partial<Utility>) =>
    apiFetch<Utility>('/admin/utilities', { method: 'POST', body }),
  update: (id: number, body: Partial<Utility>) =>
    apiFetch<Utility>(`/admin/utilities/${id}`, { method: 'PUT', body }),
  remove: (id: number) => apiFetch<null>(`/admin/utilities/${id}`, { method: 'DELETE' }),
  createDownload: (body: Partial<Download>) =>
    apiFetch<Download>('/admin/utilities/downloads', { method: 'POST', body }),
  updateDownload: (id: number, body: Partial<Download>) =>
    apiFetch<Download>(`/admin/utilities/downloads/${id}`, { method: 'PUT', body }),
  removeDownload: (id: number) =>
    apiFetch<null>(`/admin/utilities/downloads/${id}`, { method: 'DELETE' }),
};
