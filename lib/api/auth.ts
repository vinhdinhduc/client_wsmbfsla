import { apiFetch } from './client';
import { AuthUser, LoginResult } from '@/types/user';

export const authApi = {
  requestReset: (identifier: string) => apiFetch<{ challenge: string; expires_in: number; resend_after: number; message: string }>('/auth/forgot-password', { method: 'POST', body: { identifier } }),
  verifyReset: (challenge: string, otp: string) => apiFetch<{ reset_token: string; expires_at: string }>('/auth/verify-reset-otp', { method: 'POST', body: { challenge, otp } }),
  resetPassword: (challenge: string, reset_token: string, password: string, confirm_password: string) => apiFetch<null>('/auth/reset-password', { method: 'POST', body: { challenge, reset_token, password, confirm_password } }),
  login: (username: string, password: string) =>
    apiFetch<LoginResult>('/auth/login', { method: 'POST', body: { username, password } }),

  logout: () => apiFetch<null>('/auth/logout', { method: 'POST' }),

  me: () => apiFetch<AuthUser>('/auth/me'),
};
