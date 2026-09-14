import { apiFetch } from './client';
import { AdminUser, UserRole, UserStatus } from '@/types/user';

export interface UserFormValues {
  username: string;
  password?: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  avatar?: File;
  role: UserRole;
  status: UserStatus;
}

export const usersApi = {
  list: () => apiFetch<AdminUser[]>('/admin/users'),

  getById: (id: number) => apiFetch<AdminUser>(`/admin/users/${id}`),

  create: (dto: UserFormValues) => apiFetch<AdminUser>('/admin/users', userRequest('POST', dto)),

  update: (id: number, dto: Partial<UserFormValues>) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, userRequest('PUT', dto)),

  remove: (id: number) => apiFetch<null>(`/admin/users/${id}`, { method: 'DELETE' }),
};

function userRequest(method: 'POST' | 'PUT', dto: Partial<UserFormValues>) {
  if (!dto.avatar) return { method, body: dto };
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'avatar') form.append(key, String(value));
  });
  form.append('avatar', dto.avatar);
  return { method, body: form, isFormData: true };
}
