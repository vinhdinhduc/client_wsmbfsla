import { apiFetch } from './client';
import { StoreAppointment, AppointmentStatus } from '@/types/appointment';

export const appointmentsApi = {
  list: () => apiFetch<StoreAppointment[]>('/admin/appointments'),
  updateStatus: (id: number, status: AppointmentStatus) =>
    apiFetch<StoreAppointment>(`/admin/appointments/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
};
