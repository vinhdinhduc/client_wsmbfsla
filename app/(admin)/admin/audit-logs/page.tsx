'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/lib/api/auditLogs';
import { Table, TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { AuditLog } from '@/types/user';
import { formatDateTime } from '@/lib/format';

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'create', label: 'Tạo mới' },
  { value: 'update', label: 'Cập nhật' },
  { value: 'delete', label: 'Xóa' },
  { value: 'login', label: 'Đăng nhập' },
  { value: 'logout', label: 'Đăng xuất' },
];
const ACTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'primary',
  logout: 'neutral',
};
const PAGE_SIZE = 15;

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, module, action],
    queryFn: () =>
      auditLogsApi.list({
        page,
        page_size: PAGE_SIZE,
        module: module || undefined,
        action: (action || undefined) as AuditLog['action'] | undefined,
      }),
  });

  const columns: TableColumn<AuditLog>[] = [
    { key: 'created_at', header: 'Thời gian', render: (l) => formatDateTime(l.created_at), sortAccessor: (l) => l.created_at },
    { key: 'user', header: 'Người thực hiện', render: (l) => l.user?.full_name ?? '(Hệ thống)' },
    { key: 'module', header: 'Module', render: (l) => l.module },
    { key: 'action', header: 'Hành động', render: (l) => <Badge tone={ACTION_TONE[l.action]}>{ACTION_OPTIONS.find((a) => a.value === l.action)?.label ?? l.action}</Badge> },
    { key: 'description', header: 'Mô tả', render: (l) => l.description ?? '' },
    { key: 'ip_address', header: 'IP', render: (l) => l.ip_address ?? '' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-neutral-900">Nhật ký thao tác</h1>

      <div className="flex flex-wrap gap-2">
        <input
          value={module}
          onChange={(e) => { setModule(e.target.value); setPage(1); }}
          placeholder="Lọc theo module (vd: news, sims...)"
          className="h-10 rounded-lg border border-neutral-100 px-3 text-sm"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="h-10 rounded-lg border border-neutral-100 px-3 text-sm"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <Table columns={columns} data={data?.items ?? []} rowKey={(l) => l.id} isLoading={isLoading} />

      {data && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
