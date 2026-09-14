'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { appointmentsApi } from '@/lib/api/appointments';
import { AppointmentStatus, StoreAppointment } from '@/types/appointment';
import { Table, TableColumn } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { SelectField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from '../admin-shared.module.scss';

const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'huy', label: 'Hủy' },
];
const STATUS_TONE: Record<AppointmentStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  moi: 'primary',
  dang_xu_ly: 'warning',
  hoan_thanh: 'success',
  huy: 'danger',
};

export default function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<StoreAppointment | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: appointmentsApi.list,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      setDetail(updated);
      showToast('Đã cập nhật trạng thái lịch hẹn');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: TableColumn<StoreAppointment>[] = [
    {
      key: 'customer_name',
      header: 'Khách hàng',
      render: (a) => a.customer_name,
      sortAccessor: (a) => a.customer_name,
    },
    { key: 'phone', header: 'SĐT', render: (a) => a.phone },
    { key: 'store', header: 'Cửa hàng', render: (a) => a.store?.name ?? `#${a.store_id}` },
    {
      key: 'appointment',
      header: 'Thời gian',
      render: (a) => `${a.appointment_date.slice(0, 10)} ${a.appointment_time}`,
    },
    {
      key: 'assignee',
      header: 'Giao dịch viên',
      render: (a) => a.assignee?.full_name ?? 'Chưa có ca trực',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (a) => (
        <Badge tone={STATUS_TONE[a.status]}>
          {STATUS_OPTIONS.find((s) => s.value === a.status)?.label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (a) => (
        <button
          type="button"
          onClick={() => setDetail(a)}
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
        <h1 className={styles.title}>Lịch hẹn đến cửa hàng ({data?.length ?? 0})</h1>
      </div>
      <Table columns={columns} data={data ?? []} rowKey={(a) => a.id} isLoading={isLoading} />
      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title="Chi tiết lịch hẹn">
        {detail && (
          <div className={styles.form}>
            <p>
              <strong>{detail.customer_name}</strong> · {detail.phone}
            </p>
            <p>
              {detail.store?.name} · {detail.appointment_date.slice(0, 10)} lúc{' '}
              {detail.appointment_time}
            </p>
            {detail.note && <p>{detail.note}</p>}
            <SelectField
              label="Trạng thái"
              options={STATUS_OPTIONS}
              value={detail.status}
              onChange={(event) =>
                updateMutation.mutate({
                  id: detail.id,
                  status: event.target.value as AppointmentStatus,
                })
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
