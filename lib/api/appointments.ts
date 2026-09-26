import { apiFetch } from './client';
import { StoreAppointment, AppointmentStatus } from '@/types/appointment';

export const appointmentsApi = {
  slots: (store_id: number, date: string) =>
    apiFetch<string[]>('/public/appointments/slots', { params: { store_id, date } }),
  manage: (token: string) =>
    apiFetch<StoreAppointment>('/public/appointments/manage', {
      params: { token },
      cache: 'no-store',
    }),
  list: () => apiFetch<StoreAppointment[]>('/admin/appointments'),
  updateStatus: (id: number, status: AppointmentStatus) =>
    apiFetch<StoreAppointment>(`/admin/appointments/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
  cancel: (token: string) =>
    apiFetch<{ code: string; status: AppointmentStatus }>('/public/appointments/cancel', {
      method: 'POST',
      body: { token },
    }),
  reschedule: (token: string, date: string, time: string) =>
    apiFetch<StoreAppointment>('/public/appointments/reschedule', {
      method: 'POST',
      body: { token, date, time },
    }),
};
