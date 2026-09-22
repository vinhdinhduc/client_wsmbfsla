import { apiFetch } from './client';
import { PaginatedResult } from '@/types/product';
import { RegistrationGroup, RegistrationStatus, SubmitCartPayload } from '@/types/order';

export const ordersApi = {
  // ---- Public ----
  submit: (payload: SubmitCartPayload) =>
    apiFetch<RegistrationGroup>('/public/registrations', { method: 'POST', body: payload }),

  // ---- Admin ----
  list: (params: { status?: RegistrationStatus; search?: string; store_id?: number; from?: string; to?: string; page?: number; page_size?: number } = {}) =>
    apiFetch<PaginatedResult<RegistrationGroup>>('/admin/registration-groups', { params }),

  get: (id: number) => apiFetch<RegistrationGroup>(`/admin/registration-groups/${id}`),
  counts: () => apiFetch<Record<RegistrationStatus | 'all', number>>('/admin/registration-groups/counts'),
  exportExcel: (params: { status?: RegistrationStatus; search?: string; store_id?: number; from?: string; to?: string }) => apiFetch<Blob>('/admin/registration-groups/export', { params }),
  receipt: (id: number) => apiFetch<Blob>(`/admin/registration-groups/${id}/receipt`),

  updateStatus: (id: number, dto: { status?: RegistrationStatus; assigned_to?: number | null; store_id?: number | null; note?: string }) =>
    apiFetch<RegistrationGroup>(`/admin/registration-groups/${id}`, { method: 'PATCH', body: dto }),
};
