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
const TYPE_LABEL: Record<string, string> = { sim: 'Sim số', goi_cuoc: 'Gói cước', giai_phap: 'Giải pháp' };
const PAGE_SIZE = 10;

export default function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all');
  const [detailTarget, setDetailTarget] = useState<RegistrationGroup | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', page, statusFilter],
    queryFn: () => ordersApi.list({ status: statusFilter === 'all' ? undefined : statusFilter, page, page_size: PAGE_SIZE }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RegistrationStatus }) => ordersApi.updateStatus(id, { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      showToast('Đã cập nhật trạng thái');
      setDetailTarget(updated);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: TableColumn<RegistrationGroup>[] = [
    { key: 'customer_name', header: 'Khách hàng', render: (g) => g.customer_name, sortAccessor: (g) => g.customer_name },
    { key: 'phone', header: 'SĐT', render: (g) => g.phone },
    { key: 'items', header: 'Số sản phẩm', render: (g) => g.items.length },
    { key: 'created_at', header: 'Ngày tạo', render: (g) => formatDateTime(g.created_at), sortAccessor: (g) => g.created_at },
    { key: 'status', header: 'Trạng thái', render: (g) => <Badge tone={STATUS_TONE[g.status]}>{STATUS_OPTIONS.find((s) => s.value === g.status)?.label}</Badge> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (g) => (
        <button type="button" onClick={() => setDetailTarget(g)} aria-label="Xem chi tiết" className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary before:absolute before:-inset-1 before:content-['']">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Danh sách đăng ký</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-neutral-100 px-3 text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Table columns={columns} data={data?.items ?? []} rowKey={(g) => g.id} isLoading={isLoading} />

      {data && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={detailTarget !== null} onClose={() => setDetailTarget(null)} title="Chi tiết đăng ký" maxWidthClassName="max-w-xl">
        {detailTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-neutral-500">Khách hàng</p>
                <p className="font-medium text-neutral-900">{detailTarget.customer_name}</p>
              </div>
              <div>
                <p className="text-neutral-500">Số điện thoại</p>
                <p className="font-medium text-neutral-900">{detailTarget.phone}</p>
              </div>
              <div>
                <p className="text-neutral-500">Ngày tạo</p>
                <p className="font-medium text-neutral-900">{formatDateTime(detailTarget.created_at)}</p>
              </div>
            </div>
            {detailTarget.note && (
              <div>
                <p className="text-sm text-neutral-500">Ghi chú</p>
                <p className="text-sm text-neutral-900">{detailTarget.note}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-neutral-900">Sản phẩm đã đăng ký</p>
              <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {detailTarget.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="text-xs text-neutral-500">{TYPE_LABEL[item.type]}</p>
                      <p className="text-neutral-900">{item.reference_label}</p>
                    </div>
                    <p className="font-semibold text-accent">{formatPrice(item.price_snapshot)}</p>
                  </div>
                ))}
              </div>
            </div>

            <SelectField
              label="Cập nhật trạng thái"
              options={STATUS_OPTIONS}
              value={detailTarget.status}
              onChange={(e) => updateStatusMutation.mutate({ id: detailTarget.id, status: e.target.value as RegistrationStatus })}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
