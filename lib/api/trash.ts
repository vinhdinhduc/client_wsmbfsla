import { apiFetch } from './client';

export type TrashType = 'registration_groups' | 'contacts' | 'store_appointments';

export interface TrashRecord {
  type: TrashType;
  id: number;
  code: string | null;
  label: string;
  status: string;
  created_at: string;
  deleted_at: string | null;
}

export const trashApi = {
  list: () => apiFetch<TrashRecord[]>('/admin/trash'),
  restore: (type: TrashType, id: number) =>
    apiFetch<{ id: number; label: string }>(`/admin/trash/${type}/${id}/restore`, {
      method: 'POST',
    }),
  permanentlyRemove: (type: TrashType, id: number, password: string) =>
    apiFetch<null>(`/admin/trash/${type}/${id}`, {
      method: 'DELETE',
      body: { password },
    }),
};
