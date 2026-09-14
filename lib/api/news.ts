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
  status: 'draft' | 'published';
  published_at?: string | null;
}

export const newsApi = {
  listPublic: (
    params: { category?: NewsCategory; page?: number; page_size?: number } = {},
    opts?: Pick<ApiFetchOptions, 'next' | 'cache'>,
  ) => apiFetch<PaginatedResult<News>>('/public/news', { params, ...opts }),

  getPublicBySlug: (slug: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<News>(`/public/news/${slug}`, opts),

  listAdmin: () => apiFetch<News[]>('/admin/news'),

  getById: (id: number) => apiFetch<News>(`/admin/news/${id}`),

  create: (dto: NewsFormValues) => apiFetch<News>('/admin/news', newsRequest('POST', dto)),

  update: (id: number, dto: Partial<NewsFormValues>) =>
    apiFetch<News>(`/admin/news/${id}`, newsRequest('PUT', dto)),

  remove: (id: number) => apiFetch<null>(`/admin/news/${id}`, { method: 'DELETE' }),
};

function newsRequest(method: 'POST' | 'PUT', dto: Partial<NewsFormValues>) {
  if (!dto.image) return { method, body: dto };
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'image') form.append(key, String(value));
  });
  form.append('image', dto.image);
  return { method, body: form, isFormData: true };
}
