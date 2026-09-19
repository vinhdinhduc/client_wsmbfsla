'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { RegistrationGroup, RegistrationStatus } from '@/types/order';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, formatPrice } from '@/lib/format';
import styles from './page.module.scss';

const STATUS_OPTIONS: Array<{ value: RegistrationStatus; label: string }> = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'huy', label: 'Hủy' },
];
const STATUS_TONE: Record<RegistrationStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  moi: 'primary',
  dang_xu_ly: 'warning',
  hoan_thanh: 'success',
  huy: 'danger',
};
const TYPE_LABEL: Record<string, string> = {
  sim: 'Sim số',
  goi_cuoc: 'Gói cước',
  giai_phap: 'Giải pháp',
};
const PAGE_SIZE = 10;

export default function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all');
  const [detailTarget, setDetailTarget] = useState<RegistrationGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', page, statusFilter],
    queryFn: () =>
      ordersApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RegistrationStatus }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      showToast('Đã cập nhật trạng thái');
      setDetailTarget(updated);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: TableColumn<RegistrationGroup>[] = [
    {
      key: 'customer_name',
      header: 'Khách hàng',
      render: (g) => g.customer_name,
      sortAccessor: (g) => g.customer_name,
    },
    { key: 'phone', header: 'SĐT', render: (g) => g.phone },
    { key: 'items', header: 'Số sản phẩm', render: (g) => g.items.length },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      render: (g) => formatDateTime(g.created_at),
      sortAccessor: (g) => g.created_at,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (g) => (
        <Badge tone={STATUS_TONE[g.status]}>
          {STATUS_OPTIONS.find((s) => s.value === g.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (g) => (
        <button
          type="button"
          onClick={() => setDetailTarget(g)}
          aria-label="Xem chi tiết"
          className={styles.iconButton}
        >
          <Eye className={styles.icon} />
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Danh sách đăng ký</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className={styles.filter}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.items ?? []}
        rowKey={(g) => g.id}
        isLoading={isLoading}
      />

      {data && (
        <div className={styles.paginationWrap}>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        isOpen={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="Chi tiết đăng ký"
        maxWidth="xl"
      >
        {detailTarget && (
          <div className={styles.detailPanel}>
            <div className={styles.detailGrid}>
              <div>
                <p className={styles.label}>Khách hàng</p>
                <p className={styles.value}>{detailTarget.customer_name}</p>
              </div>
              <div>
                <p className={styles.label}>Số điện thoại</p>
                <p className={styles.value}>{detailTarget.phone}</p>
              </div>
              <div>
                <p className={styles.label}>Ngày tạo</p>
                <p className={styles.value}>{formatDateTime(detailTarget.created_at)}</p>
              </div>
            </div>
            {detailTarget.note && (
              <div>
                <p className={styles.label}>Ghi chú</p>
                <p className={styles.note}>{detailTarget.note}</p>
              </div>
            )}

            <div>
              <p className={styles.value}>Sản phẩm đã đăng ký</p>
              <div className={styles.itemsList}>
                {(detailTarget.items ?? []).map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div>
                      <p className={styles.itemType}>{TYPE_LABEL[item.type]}</p>
                      <p className={styles.itemName}>{item.reference_label}</p>
                    </div>
                    <p className={styles.itemPrice}>{formatPrice(item.price_snapshot)}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className={styles.actionLabel}>Hành động</p>
            <SelectField
              label="Trạng thái mới"
              options={STATUS_OPTIONS}
              value={detailTarget.status}
              onChange={(e) =>
                updateStatusMutation.mutate({
                  id: detailTarget.id,
                  status: e.target.value as RegistrationStatus,
                })
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
