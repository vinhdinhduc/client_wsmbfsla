import { apiFetch } from './client';
import { AuditLog } from '@/types/user';
import { PaginatedResult } from '@/types/product';

export interface AuditLogQuery {
  user_id?: number;
  module?: string;
  action?: 'create' | 'update' | 'delete' | 'login' | 'logout';
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const auditLogsApi = {
  // Audit log la READ-ONLY tuyet doi o ca backend lan frontend - chi co ham list.
  list: (query: AuditLogQuery = {}) =>
    apiFetch<PaginatedResult<AuditLog>>('/admin/audit-logs', { params: query }),
};
