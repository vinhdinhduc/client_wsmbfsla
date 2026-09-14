import { apiFetch, ApiFetchOptions } from './client';
import { WorkShift } from '@/types/user';

export interface ShiftFormValues {
  user_id: number;
  store_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  note?: string | null;
}

export interface CurrentDutyStaff {
  name: string;
  phone: string;
  avatar_url: string | null;
}

export const shiftsApi = {
  currentDutyStaff: (opts?: Pick<ApiFetchOptions, 'next' | 'cache'>) =>
    apiFetch<CurrentDutyStaff>('/public/current-duty-staff', { cache: 'no-store', ...opts }),

  list: () => apiFetch<WorkShift[]>('/admin/shifts'),

  mySchedule: () => apiFetch<WorkShift[]>('/admin/shifts/my-schedule'),

  create: (dto: ShiftFormValues) =>
    apiFetch<WorkShift>('/admin/shifts', { method: 'POST', body: dto }),

  update: (id: number, dto: Partial<ShiftFormValues>) =>
    apiFetch<WorkShift>(`/admin/shifts/${id}`, { method: 'PUT', body: dto }),

  remove: (id: number) => apiFetch<null>(`/admin/shifts/${id}`, { method: 'DELETE' }),
};
