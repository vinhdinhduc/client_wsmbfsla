'use client';
import { FilterBar } from '@/components/ui/FilterBar';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/lib/api/auditLogs';
import { Table, TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { AuditLog } from '@/types/user';
import { formatDateTime } from '@/lib/format';
import styles from './page.module.scss';

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
const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
};
const MODULE_LABELS: Record<string, string> = {
  users: 'Tài khoản người dùng',
  news: 'Tin tức',
  packages: 'Gói cước',
  sims: 'Sim số đẹp',
  solutions: 'Giải pháp số',
  stores: 'Cửa hàng',
  sliders: 'Banner / Slider',
  shifts: 'Lịch trực',
  settings: 'Cài đặt hệ thống',
  contacts: 'Liên hệ',
  store_appointments: 'Lịch hẹn cửa hàng',
  registration_groups: 'Đăng ký dịch vụ',
};
const CODE_LABELS: Record<string, string> = {
  ...MODULE_LABELS,
  general: 'Thông tin chung',
  theme: 'Giao diện',
  ai: 'Trợ lý AI',
  analytics: 'Đo lường',
};
const PAGE_SIZE = 15;

function getModuleLabel(module: string) {
  return MODULE_LABELS[module] ?? module;
}

function getDescription(log: AuditLog) {
  const description = log.description ?? '';
  const defaultDescription = description.match(/^(create|update|delete|login|logout)\s+(.+)$/i);
  if (defaultDescription) {
    return `${ACTION_LABELS[defaultDescription[1].toLowerCase()] ?? defaultDescription[1]} ${getModuleLabel(defaultDescription[2])}`;
  }
  return description.replace(
    /\b(store_appointments|registration_groups|users|news|packages|sims|solutions|stores|sliders|shifts|settings|contacts|general|theme|ai|analytics)\b/g,
    (value) => CODE_LABELS[value] ?? value,
  );
}

function getIpLabel(ip: string | null) {
  if (!ip) return 'Không xác định';
  return ip === '::1' || ip === '::ffff:127.0.0.1' ? `${ip} (máy local)` : ip;
}

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
    {
      key: 'created_at',
      header: 'Thời gian',
      render: (l) => formatDateTime(l.created_at),
      sortAccessor: (l) => l.created_at,
    },
    { key: 'user', header: 'Người thực hiện', render: (l) => l.user?.full_name ?? '(Hệ thống)' },
    { key: 'module', header: 'Module', render: (l) => getModuleLabel(l.module) },
    {
      key: 'action',
      header: 'Hành động',
      render: (l) => (
        <Badge tone={ACTION_TONE[l.action]}>
          {ACTION_OPTIONS.find((a) => a.value === l.action)?.label ?? l.action}
        </Badge>
      ),
    },
    { key: 'description', header: 'Mô tả', render: getDescription },
    { key: 'ip_address', header: 'IP', render: (l) => getIpLabel(l.ip_address) },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Nhật ký thao tác</h1>

      <FilterBar label="Lọc nhật ký">
        <input
          type="search"
          aria-label="Lọc theo module"
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            setPage(1);
          }}
          placeholder="Lọc theo module (vd: news, sims...)"
          className={styles.control}
        />
        <select
          aria-label="Lọc theo thao tác"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className={styles.control}
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </FilterBar>

      <Table
        columns={columns}
        data={data?.items ?? []}
        rowKey={(l) => l.id}
        isLoading={isLoading}
      />

      {data && (
        <div className={styles.pagination}>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
