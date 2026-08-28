import { apiFetch } from './client';
import { PaginatedResult } from '@/types/product';
import { RegistrationGroup, RegistrationStatus, SubmitCartPayload } from '@/types/order';

export const ordersApi = {
  // ---- Public ----
  submit: (payload: SubmitCartPayload) =>
    apiFetch<RegistrationGroup>('/public/registrations', { method: 'POST', body: payload }),

  // ---- Admin ----
  list: (params: { status?: RegistrationStatus; page?: number; page_size?: number } = {}) =>
    apiFetch<PaginatedResult<RegistrationGroup>>('/admin/registration-groups', { params }),

  updateStatus: (id: number, dto: { status?: RegistrationStatus; assigned_to?: number | null }) =>
    apiFetch<RegistrationGroup>(`/admin/registration-groups/${id}`, { method: 'PATCH', body: dto }),
};
