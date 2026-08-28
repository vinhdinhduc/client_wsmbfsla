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
    queryFn: () => contactsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter, page, page_size: PAGE_SIZE }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactStatus }) => contactsApi.updateStatus(id, status),
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
    { key: 'created_at', header: 'Ngày gửi', render: (c) => formatDateTime(c.created_at), sortAccessor: (c) => c.created_at },
    { key: 'status', header: 'Trạng thái', render: (c) => <Badge tone={c.status === 'moi' ? 'primary' : 'success'}>{STATUS_OPTIONS.find((s) => s.value === c.status)?.label}</Badge> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (c) => (
        <button type="button" onClick={() => setDetailTarget(c)} aria-label="Xem chi tiết" className="relative rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary before:absolute before:-inset-1 before:content-['']">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Danh sách liên hệ</h1>
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

      <Table columns={columns} data={data?.items ?? []} rowKey={(c) => c.id} isLoading={isLoading} />

      {data && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={detailTarget !== null} onClose={() => setDetailTarget(null)} title="Chi tiết liên hệ">
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <p><span className="text-neutral-500">Họ tên: </span><span className="font-medium text-neutral-900">{detailTarget.name}</span></p>
            <p><span className="text-neutral-500">SĐT: </span><span className="font-medium text-neutral-900">{detailTarget.phone}</span></p>
            <p><span className="text-neutral-500">Email: </span><span className="font-medium text-neutral-900">{detailTarget.email}</span></p>
            <div>
              <p className="text-neutral-500">Nội dung</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-neutral-100 p-3 text-neutral-900">{detailTarget.message}</p>
            </div>
            {detailTarget.status === 'moi' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  isLoading={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: detailTarget.id, status: 'da_xu_ly' })}
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
