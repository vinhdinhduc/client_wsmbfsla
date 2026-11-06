'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { PasswordConfirmDialog } from '@/components/shared/PasswordConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { trashApi, TrashRecord, TrashType } from '@/lib/api/trash';
import styles from './page.module.scss';

const TYPE_LABELS: Record<TrashType, string> = {
  registration_groups: 'Đăng ký',
  contacts: 'Liên hệ',
  store_appointments: 'Lịch hẹn',
};

const STATUS_LABELS: Record<string, string> = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  hoan_thanh: 'Hoàn thành',
  da_phan_hoi: 'Đã phản hồi',
  huy: 'Đã hủy',
};

function formatTimestamp(value: string | null) {
  if (!value) return 'Không xác định';
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function AdminTrashPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<'all' | TrashType>('all');
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<TrashRecord | null>(null);
  const query = useQuery({ queryKey: ['admin-trash'], queryFn: trashApi.list });
  const records = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(
    () => records.filter((record) => typeFilter === 'all' || record.type === typeFilter),
    [records, typeFilter],
  );
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const restore = useMutation({
    mutationFn: ({ type, id }: { type: TrashType; id: number }) => trashApi.restore(type, id),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-trash'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
      showToast(`Đã khôi phục “${record.label}”`);
    },
    onError: (error: Error) => showToast(error.message || 'Không thể khôi phục bản ghi.', 'error'),
  });

  const permanentlyRemove = useMutation({
    mutationFn: ({ record, password }: { record: TrashRecord; password: string }) =>
      trashApi.permanentlyRemove(record.type, record.id, password),
    onSuccess: () => {
      setConfirmTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-trash'] });
      showToast('Đã xóa vĩnh viễn bản ghi');
    },
    onError: (error: Error) =>
      showToast(error.message || 'Không thể xóa vĩnh viễn bản ghi.', 'error'),
  });

  function changeType(value: 'all' | TrashType) {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>QUẢN LÝ DỮ LIỆU</p>
          <h1 className={styles.title}>Thùng rác</h1>
          <p className={styles.description}>
            Bản ghi đã xóa mềm được lưu tại đây. Bạn có thể khôi phục hoặc xóa vĩnh viễn.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={query.isFetching ? styles.spinning : undefined} aria-hidden="true" />
          Làm mới
        </button>
      </header>

      <div className={styles.toolbar}>
        <label>
          <span>Loại bản ghi</span>
          <select
            value={typeFilter}
            onChange={(event) => changeType(event.target.value as 'all' | TrashType)}
          >
            <option value="all">Tất cả</option>
            <option value="registration_groups">Đăng ký</option>
            <option value="contacts">Liên hệ</option>
            <option value="store_appointments">Lịch hẹn</option>
          </select>
        </label>
        <span className={styles.count}>{filtered.length} bản ghi trong thùng rác</span>
      </div>

      {query.isLoading ? (
        <p className={styles.state} role="status">Đang tải thùng rác…</p>
      ) : query.isError ? (
        <div className={styles.error} role="alert">
          Không thể tải thùng rác.
          <button type="button" onClick={() => void query.refetch()}>Thử lại</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Trash2 aria-hidden="true" />
          <h2>Thùng rác đang trống</h2>
          <p>Bản ghi xóa mềm sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Mã</th>
                  <th>Khách hàng / tiêu đề</th>
                  <th>Trạng thái</th>
                  <th>Ngày xóa</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={`${record.type}-${record.id}`}>
                    <td>{TYPE_LABELS[record.type]}</td>
                    <td>{record.code || `#${record.id}`}</td>
                    <td>{record.label}</td>
                    <td>{STATUS_LABELS[record.status] ?? record.status}</td>
                    <td>{formatTimestamp(record.deleted_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.restoreButton}
                          disabled={restore.isPending || permanentlyRemove.isPending}
                          onClick={() => restore.mutate({ type: record.type, id: record.id })}
                        >
                          <RotateCcw aria-hidden="true" />
                          Khôi phục
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          disabled={restore.isPending || permanentlyRemove.isPending}
                          onClick={() => setConfirmTarget(record)}
                        >
                          <Trash2 aria-hidden="true" />
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className={styles.footer}>
            <span>{filtered.length} kết quả</span>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
            />
          </footer>
        </>
      )}

      <PasswordConfirmDialog
        isOpen={confirmTarget !== null}
        title="Xác nhận xóa vĩnh viễn"
        description={`Bản ghi “${confirmTarget?.label ?? ''}” sẽ bị xóa vĩnh viễn và không thể khôi phục. Nhập mật khẩu quản trị để xác nhận.`}
        confirmLabel="Xóa vĩnh viễn"
        isPending={permanentlyRemove.isPending}
        onClose={() => setConfirmTarget(null)}
        onConfirm={(password) => {
          if (confirmTarget) permanentlyRemove.mutate({ record: confirmTarget, password });
        }}
      />
    </main>
  );
}
