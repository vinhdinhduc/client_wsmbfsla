import { apiFetch, ApiFetchOptions } from './client';
import { SimCatalog, SimNumber, SimStatus, SimType } from '@/types/product';

export interface SimFormValues {
  phone_number: string;
  prefix: string;
  catalog: SimCatalog;
  sim_type: SimType;
  price: number;
  bundle_note?: string | null;
  commitment_months?: number | null;
  status: SimStatus;
}

export interface SimImportResult {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export const simsApi = {
  // ---- Public ----
  listPublic: (
    params: { q?: string; prefix?: string; catalog?: string; sim_type?: SimType; price_range?: string } = {},
    opts?: Pick<ApiFetchOptions, 'cache'>,
  ) => apiFetch<SimNumber[]>('/public/sims', { params, cache: 'no-store', ...opts }),

  getPublicById: (id: number) => apiFetch<SimNumber>(`/public/sims/${id}`, { cache: 'no-store' }),

  // ---- Admin ----
  listAdmin: () => apiFetch<SimNumber[]>('/admin/sims'),

  getById: (id: number) => apiFetch<SimNumber>(`/admin/sims/${id}`),

  create: (dto: SimFormValues) => apiFetch<SimNumber>('/admin/sims', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<SimFormValues>) =>
    apiFetch<SimNumber>(`/admin/sims/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/sims/${id}`, { method: 'DELETE' }),

  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<SimImportResult>('/admin/sims/import', {
      method: 'POST',
      body: form,
      isFormData: true,
    });
  },
};
