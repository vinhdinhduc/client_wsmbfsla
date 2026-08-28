import { apiFetch } from './client';
import { PaginatedResult } from '@/types/product';
import { ContactMessage, ContactStatus } from '@/types/order';

export interface ContactFormValues {
  name: string;
  phone: string;
  email: string;
  message: string;
  recaptcha_token: string;
}

export const contactsApi = {
  create: (dto: ContactFormValues) =>
    apiFetch<ContactMessage>('/public/contacts', { method: 'POST', body: dto }),

  list: (params: { status?: ContactStatus; page?: number; page_size?: number } = {}) =>
    apiFetch<PaginatedResult<ContactMessage>>('/admin/contacts', { params }),

  updateStatus: (id: number, status: ContactStatus) =>
    apiFetch<ContactMessage>(`/admin/contacts/${id}`, { method: 'PATCH', body: { status } }),
};
