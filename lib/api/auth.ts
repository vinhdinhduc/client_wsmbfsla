import { apiFetch } from './client';
import { AuthUser, LoginResult } from '@/types/user';

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<LoginResult>('/auth/login', { method: 'POST', body: { username, password } }),

  logout: () => apiFetch<null>('/auth/logout', { method: 'POST' }),

  me: () => apiFetch<AuthUser>('/auth/me'),
};
