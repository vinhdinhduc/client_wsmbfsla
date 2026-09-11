'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { contactsApi } from '@/lib/api/contacts';
import { ContactMessage, ContactStatus } from '@/types/order';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import styles from './page.module.scss';

const STATUS_OPTIONS: Array<{ value: ContactStatus; label: string }> = [
  { value: 'moi', label: 'Mới' },
  { value: 'da_xu_ly', label: 'Đã xử lý' },
];
const PAGE_SIZE = 10;

export default function AdminContactsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'all'>('all');
  const [detailTarget, setDetailTarget] = useState<ContactMessage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-contacts', page, statusFilter],
    queryFn: () =>
      contactsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactStatus }) =>
      contactsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      showToast('Đã cập nhật trạng thái');
      setDetailTarget(updated);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: TableColumn<ContactMessage>[] = [
    { key: 'name', header: 'Họ tên', render: (c) => c.name, sortAccessor: (c) => c.name },
    { key: 'phone', header: 'SĐT', render: (c) => c.phone },
    { key: 'email', header: 'Email', render: (c) => c.email },
    {
      key: 'created_at',
      header: 'Ngày gửi',
      render: (c) => formatDateTime(c.created_at),
      sortAccessor: (c) => c.created_at,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (c) => (
        <Badge tone={c.status === 'moi' ? 'primary' : 'success'}>
          {STATUS_OPTIONS.find((s) => s.value === c.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <button
          type="button"
          onClick={() => setDetailTarget(c)}
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
        <h1 className={styles.title}>Danh sách liên hệ</h1>
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
        rowKey={(c) => c.id}
        isLoading={isLoading}
      />

      {data && (
        <div className={styles.pagination}>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        isOpen={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="Chi tiết liên hệ"
      >
        {detailTarget && (
          <div className={styles.detail}>
            <p>
              <span className={styles.muted}>Họ tên: </span>
              <span className={styles.value}>{detailTarget.name}</span>
            </p>
            <p>
              <span className={styles.muted}>SĐT: </span>
              <span className={styles.value}>{detailTarget.phone}</span>
            </p>
            <p>
              <span className={styles.muted}>Email: </span>
              <span className={styles.value}>{detailTarget.email}</span>
            </p>
            <div>
              <p className={styles.messageLabel}>Nội dung</p>
              <p className={styles.message}>{detailTarget.message}</p>
            </div>
            {detailTarget.status === 'moi' && (
              <div className={styles.detailAction}>
                <Button
                  size="sm"
                  isLoading={updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({ id: detailTarget.id, status: 'da_xu_ly' })
                  }
                >
                  Đánh dấu đã xử lý
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
