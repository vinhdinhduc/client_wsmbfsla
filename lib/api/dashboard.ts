import { apiFetch } from './client';

export interface DashboardPoint { date?: string; label?: string; value: number | string }
export interface DashboardPayload {
  from: string;
  to: string;
  updated_at: string;
  kpis: { label: string; value: number; previous: number; change: number | null; sparkline: DashboardPoint[]; href: string }[];
  charts: { title: string; kind: string; data: DashboardPoint[] }[];
  urgent: { label: string; count: number; href: string }[];
  activity: { action: string; module: string; target_id: number; created_at: string }[];
}
export interface DashboardHealth { checked_at: string; services: Record<string, 'ok' | 'configured' | 'error'> }

export const dashboardApi = {
  get: (from: string, to: string) => apiFetch<DashboardPayload>('/admin/dashboard', { params: { from, to } }),
  health: () => apiFetch<DashboardHealth>('/admin/health'),
};
