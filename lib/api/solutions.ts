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
  target_customers?: string | null;
  legal_basis?: string | null;
  brochure_url?: string | null;
  video_url?: string | null;
  is_hot: boolean;
  status: 'active' | 'inactive';
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  audience_cards?: Array<{ icon: string; title: string; description: string }> | null;
  section_visibility?: Record<string, boolean> | null;
  section_titles?: Record<string, string> | null;
  seo_title?: string | null;
  seo_description?: string | null;
  features?: Array<{ icon?: string | null; title: string; description?: string | null; sort_order?: number }>;
  pricing?: Array<{ package_code: string; package_name: string; price: number; cycle_months?: number; condition_note?: string | null; status?: 'active' | 'inactive'; sort_order?: number }>;
  faqs?: Array<{ question: string; answer?: string | null; sort_order?: number }>;
  gallery?: Array<{ image_url: string; caption?: string | null; sort_order?: number }>;
  steps?: Array<{ title: string; description?: string | null; icon?: string | null; sort_order?: number }>;
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
    if (value !== undefined && value !== null && key !== 'image') form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  form.append('image', dto.image);
  return { method, body: form, isFormData: true };
}
