import { apiFetch } from './client';
import { AdminUser, UserRole, UserStatus } from '@/types/user';

export interface UserFormValues {
  username: string;
  password?: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
}

export const usersApi = {
  list: () => apiFetch<AdminUser[]>('/admin/users'),

  getById: (id: number) => apiFetch<AdminUser>(`/admin/users/${id}`),

  create: (dto: UserFormValues) => apiFetch<AdminUser>('/admin/users', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<UserFormValues>) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/users/${id}`, { method: 'DELETE' }),
};
