'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { newsletterApi } from '@/lib/api/newsletter';
import { Table, TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import type { NewsletterSubscriber } from '@/lib/api/newsletter';

const PAGE_SIZE = 15;

export default function AdminNewsletterPage() {
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter', page],
    queryFn: () => newsletterApi.list({ page, page_size: PAGE_SIZE }),
  });

  const exportMutation = useMutation({
    mutationFn: () => newsletterApi.exportExcel(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const columns: TableColumn<NewsletterSubscriber>[] = [
    { key: 'email', header: 'Email', render: (s) => s.email, sortAccessor: (s) => s.email },
    { key: 'status', header: 'Trạng thái', render: (s) => <Badge tone={s.status === 'subscribed' ? 'success' : 'neutral'}>{s.status === 'subscribed' ? 'Đang nhận' : 'Đã hủy'}</Badge> },
    { key: 'subscribed_at', header: 'Ngày đăng ký', render: (s) => formatDateTime(s.subscribed_at), sortAccessor: (s) => s.subscribed_at },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-neutral-900">Newsletter</h1>
        <Button variant="outline" isLoading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Table columns={columns} data={data?.items ?? []} rowKey={(s) => s.id} isLoading={isLoading} />

      {data && (
        <div className="flex justify-center pt-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
