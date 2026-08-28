export type UserRole = 'admin' | 'chuyen_vien' | 'giao_dich_vien' | 'nhan_vien';
export type UserStatus = 'active' | 'locked';

export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

/** Thong tin luu trong AuthContext sau khi dang nhap - khong bao gio chua password. */
export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface WorkShift {
  id: number;
  user_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  created_by: number;
  created_at: string;
  staff?: { id: number; full_name: string; phone: string };
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: string;
  target_id: number | null;
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { id: number; username: string; full_name: string };
}
