import { apiFetch } from './client';
import { PaginatedResult } from '@/types/product';

export interface NewsletterSubscriber {
  id: number;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  subscribed_at: string;
}

export const newsletterApi = {
  subscribe: (email: string) =>
    apiFetch<NewsletterSubscriber>('/public/newsletter/subscribe', { method: 'POST', body: { email } }),

  list: (params: { page?: number; page_size?: number } = {}) =>
    apiFetch<PaginatedResult<NewsletterSubscriber>>('/admin/newsletter', { params }),

  /** Tra ve Blob (file .xlsx) - noi goi tu tao link download bang URL.createObjectURL. */
  exportExcel: () => apiFetch<Blob>('/admin/newsletter/export'),
};
