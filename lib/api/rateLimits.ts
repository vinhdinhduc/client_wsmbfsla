import { apiFetch } from './client';

export interface RatePolicy { key: string; enabled: boolean | number; max_requests: number; window_seconds: number; block_seconds: number; key_by: 'ip' | 'phone' | 'ip_username' | 'user'; message: string }
export interface IpRule { id: number; kind: 'allow' | 'block'; cidr: string; reason: string | null; expires_at: string | null }
export interface RateLimitConfig { policies: RatePolicy[]; rules: IpRule[]; active_blocks: Array<{ key: string; ip: string; until: string }> }
export const rateLimitsApi = {
  list: () => apiFetch<RateLimitConfig>('/admin/rate-limits'),
  stats: () => apiFetch<Array<{ policy_key: string; blocked: number }>>('/admin/rate-limits/stats'),
  save: (key: string, body: Partial<RatePolicy>) => apiFetch<RateLimitConfig>(`/admin/rate-limits/policies/${key}`, { method: 'PUT', body }),
  addRule: (body: { kind: 'allow' | 'block'; cidr: string; reason?: string; expires_at?: string | null }) => apiFetch<RateLimitConfig>('/admin/rate-limits/rules', { method: 'POST', body }),
  removeRule: (id: number) => apiFetch<RateLimitConfig>(`/admin/rate-limits/rules/${id}`, { method: 'DELETE' }),
  unblock: (key: string) => apiFetch<RateLimitConfig>('/admin/rate-limits/unblock', { method: 'POST', body: { key } }),
  reset: () => apiFetch<RateLimitConfig>('/admin/rate-limits/reset', { method: 'POST' }),
};
