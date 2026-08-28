import { apiFetch, ApiFetchOptions } from './client';
import { Solution, SolutionCategory } from '@/types/product';

export interface SolutionFormValues {
  name: string;
  slug: string;
  category: SolutionCategory;
  thumbnail?: string | null;
  summary?: string | null;
  content: string;
  is_hot: boolean;
  status: 'active' | 'inactive';
}

export const solutionsApi = {
  listPublic: (category?: SolutionCategory, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Solution[]>('/public/solutions', { params: { category }, ...opts }),

  getPublicBySlug: (slug: string, opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<Solution>(`/public/solutions/${slug}`, opts),

  listAdmin: () => apiFetch<Solution[]>('/admin/solutions'),

  getById: (id: number) => apiFetch<Solution>(`/admin/solutions/${id}`),

  create: (dto: SolutionFormValues) =>
    apiFetch<Solution>('/admin/solutions', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<SolutionFormValues>) =>
    apiFetch<Solution>(`/admin/solutions/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/solutions/${id}`, { method: 'DELETE' }),
};
