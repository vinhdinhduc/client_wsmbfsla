import { apiFetch, ApiFetchOptions } from './client';
import { PaginatedResult, SimCatalog, SimNumber, SimStatus, SimType, SubscriptionType } from '@/types/product';

export interface SimFormValues {
  phone_number: string;
  subscription_type: SubscriptionType;
  catalog: SimCatalog;
  sim_type: SimType;
  price?: number | null;
  bundle_note?: string | null;
  commitment_months?: number | null;
  status: SimStatus;
}

export interface SimImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export const simsApi = {
  // ---- Public ----
  listPublic: (
    params: { q?: string; prefix?: string; catalog?: string; sim_type?: SimType; price_range?: string; type?: SubscriptionType } = {},
    opts?: Pick<ApiFetchOptions, 'cache'>,
  ) => apiFetch<SimNumber[]>('/public/sims', { params, cache: 'no-store', ...opts }),

  getPublicById: (id: number) => apiFetch<SimNumber>(`/public/sims/${id}`, { cache: 'no-store' }),

  // ---- Admin ----
  listAdmin: (params: {
    q?: string;
    prefix?: string;
    catalog?: SimCatalog;
    sim_type?: SimType;
    type?: SubscriptionType;
    status?: SimStatus;
    page?: number;
    page_size?: number;
  } = {}) => apiFetch<PaginatedResult<SimNumber>>('/admin/sims', { params }),

  getById: (id: number) => apiFetch<SimNumber>(`/admin/sims/${id}`),

  create: (dto: SimFormValues) => apiFetch<SimNumber>('/admin/sims', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<SimFormValues>) =>
    apiFetch<SimNumber>(`/admin/sims/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/sims/${id}`, { method: 'DELETE' }),

  bulkUpdateStatus: (ids: number[], status: SimStatus) =>
    apiFetch<{ updated: number }>('/admin/sims/bulk-status', {
      method: 'PATCH',
      body: { ids, status },
    }),

  bulkRemove: (ids: number[]) =>
    apiFetch<{ deleted: number }>('/admin/sims/bulk', { method: 'DELETE', body: { ids } }),

  importExcel: (file: File, mode: 'skip' | 'update') => {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    return apiFetch<SimImportResult>('/admin/sims/import', {
      method: 'POST',
      body: form,
      isFormData: true,
    });
  },

  downloadImportTemplate: () => apiFetch<Blob>('/admin/sims/import-template'),

  exportData: (
    format: 'xlsx' | 'csv',
    filters: Record<string, string | number | undefined> = {},
  ) => apiFetch<Blob>('/admin/sims/export', { params: { ...filters, format, scope: 'filtered' } }),
};
