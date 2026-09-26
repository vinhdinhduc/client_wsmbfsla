import { apiFetch, ApiFetchOptions } from './client';
import { News, NewsCategory, PaginatedResult } from '@/types/product';

export interface NewsFormValues {
  title: string;
  slug: string;
  category: NewsCategory;
  thumbnail?: string | null;
  image?: File;
  summary?: string | null;
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  published_at?: string | null;
  cover_url?: string | null;
  cover_alt?: string | null;
  is_featured?: boolean;
  is_pinned?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  tags?: string[];
}

export const newsApi = {
  listPublic: (
    params: { category?: NewsCategory; page?: number; page_size?: number } = {},
    opts?: Pick<ApiFetchOptions, 'next' | 'cache'>,
  ) => apiFetch<PaginatedResult<News>>('/public/news', { params, ...opts }),

  getPublicBySlug: (slug: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<News | { redirect: string }>(`/public/news/${slug}`, opts),

  featured: () => apiFetch<News[]>('/public/news-featured', { next: { revalidate: 60 } }),
  preview: (token: string) => apiFetch<News>(`/public/news-preview/${token}`, { cache: 'no-store' }),
  countView: (slug: string, visitor_id: string) => apiFetch<null>(`/public/news/${slug}/view`, { method: 'POST', body: { visitor_id } }),

  listAdmin: (params: { page?: number; page_size?: number; search?: string; category?: NewsCategory; status?: string } = {}) => apiFetch<PaginatedResult<News>>('/admin/news', { params }),

  getById: (id: number) => apiFetch<News>(`/admin/news/${id}`),

  create: (dto: NewsFormValues) => apiFetch<News>('/admin/news', newsRequest('POST', dto)),

  update: (id: number, dto: Partial<NewsFormValues>) =>
    apiFetch<News>(`/admin/news/${id}`, newsRequest('PUT', dto)),

  remove: (id: number) => apiFetch<null>(`/admin/news/${id}`, { method: 'DELETE' }),
  autosave: (id: number, content: string) => apiFetch<{ saved_at: string }>(`/admin/news/${id}/autosave`, { method: 'PUT', body: { content } }),
  duplicate: (id: number) => apiFetch<News>(`/admin/news/${id}/duplicate`, { method: 'POST' }),
};

function newsRequest(method: 'POST' | 'PUT', dto: Partial<NewsFormValues>) {
  if (!dto.image) return { method, body: dto };
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'image') form.append(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  form.append('image', dto.image);
  return { method, body: form, isFormData: true };
}
