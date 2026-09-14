export type AppointmentStatus = 'moi' | 'dang_xu_ly' | 'hoan_thanh' | 'huy';

export interface StoreAppointment {
  id: number;
  customer_name: string;
  phone: string;
  store_id: number;
  appointment_date: string;
  appointment_time: string;
  note: string | null;
  status: AppointmentStatus;
  assigned_to: number | null;
  created_at: string;
  store?: { id: number; name: string; address: string; district: string };
  assignee?: { id: number; full_name: string; phone: string };
}
