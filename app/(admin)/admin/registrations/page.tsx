'use client';
import { FilterBar } from '@/components/ui/FilterBar';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { storesApi } from '@/lib/api/stores';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api/users';
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
  solution_plan: 'Gói giải pháp',
};
const PAGE_SIZE = 10;

export default function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all');
  const [detailTarget, setDetailTarget] = useState<RegistrationGroup | null>(null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [storeId, setStoreId] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const stores = useQuery({
    queryKey: ['registration-stores'],
    queryFn: () => storesApi.listPublic(),
  });
  const staff = useQuery({
    queryKey: ['registration-staff'],
    queryFn: usersApi.list,
    enabled: user?.role === 'admin',
  });
  const counts = useQuery({ queryKey: ['registration-counts'], queryFn: ordersApi.counts });
  const detail = useQuery({
    queryKey: ['registration-detail', detailTarget?.id],
    queryFn: () => ordersApi.get(detailTarget!.id),
    enabled: !!detailTarget,
  });
  const selected = detail.data || detailTarget;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', page, statusFilter, search, from, to, storeId],
    queryFn: () =>
      ordersApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        from: from || undefined,
        to: to || undefined,
        store_id: storeId ? Number(storeId) : undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: RegistrationStatus }) =>
      ordersApi.updateStatus(id, { status, note: statusNote || undefined }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['registration-counts'] });
      queryClient.invalidateQueries({ queryKey: ['registration-detail', updated.id] });
      showToast('Đã cập nhật trạng thái');
      setDetailTarget(updated);
      setStatusNote('');
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });
  const assignMutation = useMutation({
    mutationFn: ({
      id,
      store_id,
      assigned_to,
    }: {
      id: number;
      store_id?: number | null;
      assigned_to?: number | null;
    }) => ordersApi.updateStatus(id, { store_id, assigned_to }),
    onSuccess: (updated) => {
      setDetailTarget(updated);
      queryClient.invalidateQueries({ queryKey: ['registration-detail', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      showToast('Đã cập nhật người xử lý');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  async function downloadFile(kind: 'receipt' | 'excel', id?: number) {
    try {
      const blob =
        kind === 'receipt'
          ? await ordersApi.receipt(id!)
          : await ordersApi.exportExcel({
              status: statusFilter === 'all' ? undefined : statusFilter,
              search: search || undefined,
              from: from || undefined,
              to: to || undefined,
              store_id: storeId ? Number(storeId) : undefined,
            });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = kind === 'receipt' ? `phieu-${id}.pdf` : 'dang-ky.xlsx';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast((error as Error).message, 'error');
    }
  }

  const columns: TableColumn<RegistrationGroup>[] = [
    { key: 'code', header: 'Mã', render: (g) => g.code || `#${g.id}` },
    {
      key: 'customer_name',
      header: 'Khách hàng',
      render: (g) => g.customer_name,
      sortAccessor: (g) => g.customer_name,
    },
    { key: 'phone', header: 'SĐT', render: (g) => g.phone },
    { key: 'total_amount', header: 'Tổng tiền', render: (g) => formatPrice(g.total_amount || 0) },
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
        <button type="button" className={styles.filter} onClick={() => downloadFile('excel')}>
          Xuất Excel
        </button>
      </div>
      <div className={styles.tabs} aria-label="Lọc trạng thái">
        {(
          [{ value: 'all', label: 'Tất cả' }, ...STATUS_OPTIONS] as Array<{
            value: RegistrationStatus | 'all';
            label: string;
          }>
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={statusFilter === option.value}
            onClick={() => {
              setStatusFilter(option.value);
              setPage(1);
            }}
          >
            {option.label} ({counts.data?.[option.value] ?? 0})
          </button>
        ))}
      </div>
      <FilterBar label="Lọc đăng ký">
        <input
          type="search"
          aria-label="Tìm tên, số điện thoại hoặc mã"
          placeholder="Tìm tên, SĐT hoặc mã"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Lọc cửa hàng"
          value={storeId}
          onChange={(event) => {
            setStoreId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả cửa hàng</option>
          {stores.data?.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <label>
          Từ{' '}
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Đến{' '}
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </FilterBar>

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
        {selected && (
          <div className={styles.detailPanel}>
            {detail.isError && <p role="alert">{(detail.error as Error).message}</p>}
            <p>
              <strong>{selected.code || `#${selected.id}`}</strong> ·{' '}
              {selected.customer_type === 'business' ? 'Doanh nghiệp' : 'Cá nhân'} · Tổng{' '}
              {formatPrice(selected.total_amount || 0)}
            </p>
            <div className={styles.detailGrid}>
              <div>
                <p className={styles.label}>Khách hàng</p>
                <p className={styles.value}>{selected.customer_name}</p>
              </div>
              <div>
                <p className={styles.label}>Số điện thoại</p>
                <p className={styles.value}>
                  <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                </p>
              </div>
              <div>
                <p className={styles.label}>Ngày tạo</p>
                <p className={styles.value}>{formatDateTime(selected.created_at)}</p>
              </div>
            </div>
            {selected.note && (
              <div>
                <p className={styles.label}>Ghi chú</p>
                <p className={styles.note}>{selected.note}</p>
              </div>
            )}

            <div>
              <p className={styles.value}>Sản phẩm đã đăng ký</p>
              <div className={styles.itemsList}>
                {(selected.items ?? []).map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div>
                      <p className={styles.itemType}>{TYPE_LABEL[item.type]}</p>
                      <p className={styles.itemName}>{item.reference_label}</p>
                    </div>
                    <p className={styles.itemPrice}>
                      {formatPrice(Number(item.price_snapshot || 0) * Number(item.quantity || 1))}
                      {Number(item.fee_snapshot || 0) > 0 && (
                        <small> + phí hòa mạng {formatPrice(item.fee_snapshot)}</small>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={styles.filter}
              onClick={() => downloadFile('receipt', selected.id)}
            >
              Tải phiếu PDF
            </button>
            {selected.events && (
              <section>
                <h3>Diễn biến xử lý</h3>
                {selected.events.map((event, index) => (
                  <p key={index} className={styles.event}>
                    {formatDateTime(event.created_at)} ·{' '}
                    {STATUS_OPTIONS.find((option) => option.value === event.to_status)?.label ||
                      event.to_status}
                    {event.note ? ` · ${event.note}` : ''}
                  </p>
                ))}
              </section>
            )}
            {user?.role === 'admin' && (
              <div className={styles.filters}>
                <label>
                  Cửa hàng xử lý
                  <select
                    value={selected.store_id || ''}
                    onChange={(event) =>
                      assignMutation.mutate({
                        id: selected.id,
                        store_id: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  >
                    <option value="">Chưa gán</option>
                    {stores.data?.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Người xử lý
                  <select
                    value={selected.assigned_to || ''}
                    onChange={(event) =>
                      assignMutation.mutate({
                        id: selected.id,
                        assigned_to: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  >
                    <option value="">Chưa gán</option>
                    {staff.data
                      ?.filter(
                        (person) =>
                          person.status === 'active' &&
                          (!selected.store_id || person.store_id === selected.store_id),
                      )
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}

            <p className={styles.actionLabel}>Hành động</p>
            <label>
              Ghi chú xử lý / lý do hủy
              <textarea
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
              />
            </label>
            <SelectField
              label="Trạng thái mới"
              options={STATUS_OPTIONS.filter(
                (option) =>
                  option.value === selected.status ||
                  (selected.status === 'moi' && ['dang_xu_ly', 'huy'].includes(option.value)) ||
                  (selected.status === 'dang_xu_ly' &&
                    ['hoan_thanh', 'huy'].includes(option.value)) ||
                  (selected.status === 'hoan_thanh' &&
                    option.value === 'dang_xu_ly' &&
                    user?.role === 'admin'),
              )}
              value={selected.status}
              onChange={(e) =>
                updateStatusMutation.mutate({
                  id: selected.id,
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
