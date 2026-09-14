import { apiFetch, ApiFetchOptions } from './client';
import { Solution, SolutionCategory } from '@/types/product';

export interface SolutionFormValues {
  name: string;
  slug: string;
  category: SolutionCategory;
  thumbnail?: string | null;
  image?: File;
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
    apiFetch<Solution>('/admin/solutions', solutionRequest('POST', dto)),

  update: (id: number, dto: Partial<SolutionFormValues>) =>
    apiFetch<Solution>(`/admin/solutions/${id}`, solutionRequest('PUT', dto)),

  remove: (id: number) => apiFetch<null>(`/admin/solutions/${id}`, { method: 'DELETE' }),
};

function solutionRequest(method: 'POST' | 'PUT', dto: Partial<SolutionFormValues>) {
  if (!dto.image) return { method, body: dto };
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'image') form.append(key, String(value));
  });
  form.append('image', dto.image);
  return { method, body: form, isFormData: true };
}
