'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clipboard, Download, Eye, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { storesApi } from '@/lib/api/stores';
import { RegistrationGroup, RegistrationStatus } from '@/types/order';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import {
  canTransition,
  datePreset,
  displayDate,
  money,
  parseDate,
  productNames,
  registrationRows,
  registrationStatusLabel,
  REGISTRATION_STATUSES,
  REGISTRATION_WAIT_HOURS,
  REGISTRATION_OVERDUE_HOURS,
  vietnamDate,
} from '@/lib/registration-workspace';
import { RegistrationDetail } from './RegistrationDetail';
import { styles } from './styles';

async function loadRegistrations() {
  const rows = new Map<number, RegistrationGroup>();
  for (let page = 1; ; page++) {
    const batch = await ordersApi.list({ page, page_size: 100 });
    const before = rows.size;
    batch.items.forEach((group) => rows.set(group.id, group));
    if (batch.items.length < 100) break;
    if (rows.size === before) throw new Error('INVALID_PAGINATION');
  }
  return [...rows.values()];
}
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export default function AdminRegistrationsPage() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const { showToast } = useToast();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-registrations', user?.id],
    queryFn: loadRegistrations,
    enabled: !!user,
  });
  const stores = useQuery({ queryKey: ['registration-stores'], queryFn: () => storesApi.listPublic() });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all');
  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState('priority');
  const [selected, setSelected] = useState<number[]>([]);
  const [targetStatus, setTargetStatus] = useState<RegistrationStatus | ''>('');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkNote, setBulkNote] = useState('');
  const [detail, setDetail] = useState<RegistrationGroup | null>(null);
  const [exporting, setExporting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const opener = useRef<HTMLElement | null>(null);
  const all = useMemo(() => query.data ?? [], [query.data]);
  const startDate = from ? parseDate(from) : '';
  const endDate = to ? parseDate(to) : '';
  const dateError =
    (from && !startDate) || (to && !endDate)
      ? 'Nhập ngày hợp lệ theo dd/mm/yyyy.'
      : startDate && endDate && startDate > endDate
        ? 'Từ ngày không được lớn hơn đến ngày.'
        : '';
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected([]);
    setTargetStatus('');
  }, [search, statusFilter, storeId, from, to, size]);
  const filtered = useMemo(() => {
    if (dateError) return [];
    const term = normalize(search.trim());
    return all
      .filter((group) => {
        const date = vietnamDate(new Date(group.created_at));
        return (
          (statusFilter === 'all' || group.status === statusFilter) &&
          (!storeId || String(group.store_id) === storeId) &&
          (!startDate || date >= startDate) &&
          (!endDate || date <= endDate) &&
          (!term ||
            [group.code || `#${group.id}`, group.customer_name, group.phone].some((value) =>
              normalize(value).includes(term),
            ))
        );
      })
      .sort(
        (a, b) =>
          (sort === 'priority' ? Number(b.status === 'moi') - Number(a.status === 'moi') : 0) ||
          (sort === 'asc' ? 1 : -1) * (Date.parse(a.created_at) - Date.parse(b.created_at)) ||
          b.id - a.id,
      );
  }, [all, search, statusFilter, storeId, startDate, endDate, dateError, sort]);
  const actualPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const visible = filtered.slice((actualPage - 1) * size, actualPage * size);
  const selectedGroups = all.filter((group) => selected.includes(group.id));
  const bulkOptions = REGISTRATION_STATUSES.filter(
    (option) =>
      selectedGroups.length &&
      selectedGroups.every((group) => canTransition(group.status, option.value, admin)) &&
      selectedGroups.some((group) => group.status !== option.value),
  );
  const validBulk = !!targetStatus && bulkOptions.some((option) => option.value === targetStatus);
  const bulk = useMutation({
    mutationFn: async () => {
      if (!validBulk || !targetStatus) throw new Error('INVALID_TRANSITION');
      const failed: number[] = [];
      let updated = 0;
      for (const group of selectedGroups) {
        if (group.status === targetStatus) continue;
        try {
          await ordersApi.updateStatus(group.id, {
            status: targetStatus,
            note: bulkNote.trim() || undefined,
          });
          updated++;
        } catch {
          failed.push(group.id);
        }
      }
      return { failed, updated };
    },
    onSuccess: ({ failed, updated }) => {
      setSelected(failed);
      setConfirmBulk(false);
      setBulkNote('');
      void cache.invalidateQueries({ queryKey: ['admin-registrations'] });
      void cache.invalidateQueries({ queryKey: ['registration-detail'] });
      showToast(
        failed.length
          ? `Đã đổi ${updated} đăng ký. ${failed.length} đăng ký chưa đổi; vui lòng kiểm tra lại.`
          : `Đã đổi trạng thái ${updated} đăng ký`,
        failed.length ? 'error' : 'success',
      );
    },
    onError: () => showToast('Không thể đổi trạng thái đã chọn.', 'error'),
  });
  const selectAllowed = (group: RegistrationGroup) =>
    REGISTRATION_STATUSES.some(
      (option) => option.value !== group.status && canTransition(group.status, option.value, admin),
    );
  const selectable = visible.filter(selectAllowed);
  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }
  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setStoreId('');
    setFrom('');
    setTo('');
    setPage(1);
  }
  function open(group: RegistrationGroup, element: HTMLElement) {
    element.focus();
    opener.current = element;
    setDetail(group);
  }
  function close() {
    setDetail(null);
    setTimeout(() => opener.current?.focus(), 200);
  }
  function rowKey(event: KeyboardEvent<HTMLElement>, group: RegistrationGroup) {
    if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open(group, event.currentTarget);
    }
  }
  async function copy(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      showToast('Đã sao chép số điện thoại');
    } catch {
      showToast('Không thể sao chép. Vui lòng sao chép thủ công.', 'error');
    }
  }
  function phone(group: RegistrationGroup) {
    return (
      <span className={styles.contactLine} onClick={(event) => event.stopPropagation()}>
        <a href={`tel:${group.phone}`}>{group.phone}</a>
        <button
          className={styles.copyButton}
          aria-label={`Sao chép SĐT ${group.code || group.id}`}
          onClick={() => void copy(group.phone)}
        >
          <Clipboard size={14} />
        </button>
      </span>
    );
  }
  function products(group: RegistrationGroup) {
    const names = productNames(group);
    return (
      <div className={styles.productSummary} title={names.join(', ')}>
        <span>
          {names
            .slice(0, 2)
            .map((name) => (name.length > 48 ? `${name.slice(0, 48)}…` : name))
            .join(', ') || 'Không có sản phẩm'}
        </span>
        {names.length > 2 && <b>+{names.length - 2}</b>}
      </div>
    );
  }
  function badge(group: RegistrationGroup) {
    const hours = (now - Date.parse(group.created_at)) / 3600000;
    return (
      <div className={styles.badges}>
        <span
          className={`${styles.statusBadge} ${group.status === 'moi' ? styles.statusNew : group.status === 'dang_xu_ly' ? styles.waiting : group.status === 'hoan_thanh' ? styles.statusConfirmed : styles.statusCancelled}`}
        >
          <i />
          {registrationStatusLabel(group.status)}
        </span>
        {group.status === 'moi' && hours > REGISTRATION_WAIT_HOURS && (
          <span
            className={`${styles.statusBadge} ${hours > REGISTRATION_OVERDUE_HOURS ? styles.late : styles.waiting}`}
          >
            {hours > REGISTRATION_OVERDUE_HOURS
              ? 'Quá hạn'
              : `Chờ xử lý ${Math.floor(hours / 24)} ngày`}
          </span>
        )}
      </div>
    );
  }
  function checkbox(group: RegistrationGroup) {
    return (
      <input
        type="checkbox"
        aria-label={`Chọn ${group.code || group.id}`}
        checked={selected.includes(group.id)}
        disabled={bulk.isPending || !selectAllowed(group)}
        onClick={(event) => event.stopPropagation()}
        onChange={() => toggle(group.id)}
      />
    );
  }
  function created(group: RegistrationGroup) {
    return (
      <time
        dateTime={group.created_at}
        title={new Date(group.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
      >
        {displayDate(vietnamDate(new Date(group.created_at)))}
        <small className={styles.subline}>
          {new Date(group.created_at).toLocaleTimeString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </small>
      </time>
    );
  }
  async function exportExcel() {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(registrationRows(filtered));
      sheet['!cols'] = [
        { wch: 24 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 50 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
      ];
      filtered.forEach((_, index) => {
        const cell = sheet[`H${index + 2}`];
        if (cell) cell.z = '#,##0';
      });
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Đăng ký');
      XLSX.writeFile(book, `dang-ky-${vietnamDate()}.xlsx`);
      showToast(`Đã xuất ${filtered.length} đăng ký`);
    } catch {
      showToast('Không thể xuất Excel. Vui lòng thử lại.', 'error');
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Danh sách đăng ký</h1>
          <p className={styles.total}>{all.length} đăng ký</p>
        </div>
        <button
          className={styles.secondaryButton}
          disabled={
            exporting || query.isFetching || query.isError || !filtered.length || !!dateError
          }
          onClick={() => void exportExcel()}
        >
          {exporting ? <LoaderCircle className={styles.spinning} /> : <Download />}Xuất{' '}
          {filtered.length} dòng đang lọc
        </button>
      </header>
      <nav className={styles.statusTabs} aria-label="Lọc trạng thái">
        {[{ value: 'all', label: 'Tất cả' }, ...REGISTRATION_STATUSES].map((option) => (
          <button
            key={option.value}
            className={statusFilter === option.value ? styles.activeTab : ''}
            aria-pressed={statusFilter === option.value}
            onClick={() => setStatusFilter(option.value as RegistrationStatus | 'all')}
          >
            {option.label}
            <span>
              {option.value === 'all'
                ? all.length
                : all.filter((group) => group.status === option.value).length}
            </span>
          </button>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          Tìm kiếm
          <Search />
          <input
            type="search"
            maxLength={100}
            value={search}
            placeholder="Tên, SĐT hoặc mã đăng ký"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className={styles.filterField}>
          Cửa hàng
          <select
            aria-label="Lọc cửa hàng"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
          >
            <option value="">Tất cả cửa hàng</option>
            {stores.data?.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <div className={`${styles.dateRange} ${styles.dateFields}`}>
          <label>
            Từ ngày
            <input
              className={styles.dateInput}
              aria-label="Từ ngày"
              aria-invalid={!!dateError}
              aria-describedby={dateError ? 'registration-date-error' : undefined}
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              maxLength={10}
              value={from}
              onChange={(event) => setFrom(event.target.value.replace(/[^\d/]/g, '').slice(0, 10))}
              onBlur={() => {
                if (/^\d{8}$/.test(from))
                  setFrom(`${from.slice(0, 2)}/${from.slice(2, 4)}/${from.slice(4)}`);
              }}
            />
          </label>
          <label>
            Đến ngày
            <input
              className={styles.dateInput}
              aria-label="Đến ngày"
              aria-invalid={!!dateError}
              aria-describedby={dateError ? 'registration-date-error' : undefined}
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              maxLength={10}
              value={to}
              onChange={(event) => setTo(event.target.value.replace(/[^\d/]/g, '').slice(0, 10))}
              onBlur={() => {
                if (/^\d{8}$/.test(to)) setTo(`${to.slice(0, 2)}/${to.slice(2, 4)}/${to.slice(4)}`);
              }}
            />
          </label>
        </div>
        <button
          className={styles.refreshButton}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={query.isFetching ? styles.spinning : ''} />
          Làm mới
        </button>
      </div>
      <div className={styles.presets} aria-label="Khoảng ngày nhanh">
        {[
          { value: 'today', label: 'Hôm nay' },
          { value: '7', label: '7 ngày' },
          { value: '30', label: '30 ngày' },
          { value: 'month', label: 'Tháng này' },
        ].map((option) => (
          <button
            key={option.value}
            className={styles.secondaryButton}
            onClick={() => {
              const range = datePreset(option.value);
              setFrom(range.from);
              setTo(range.to);
            }}
          >
            {option.label}
          </button>
        ))}
        <button className={styles.secondaryButton} onClick={clearFilters}>
          Xóa bộ lọc
        </button>
      </div>
      {dateError && (
        <p id="registration-date-error" className={styles.warningText} role="alert">
          {dateError}
        </p>
      )}
      <label className={styles.pageSize}>
        Sắp xếp
        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
        >
          <option value="priority">Mới trước, ngày tạo mới nhất</option>
          <option value="desc">Ngày tạo mới nhất</option>
          <option value="asc">Ngày tạo cũ nhất</option>
        </select>
      </label>
      {query.isLoading ? (
        <p role="status">Đang tải đăng ký…</p>
      ) : query.isError ? (
        <div className={styles.errorState} role="alert">
          Không thể tải danh sách đăng ký.
          <button onClick={() => void query.refetch()}>Thử lại</button>
        </div>
      ) : !filtered.length ? (
        <div className={styles.emptyState}>
          <h2>Chưa có đăng ký phù hợp</h2>
          <p>Hãy thử thay đổi bộ lọc hoặc khoảng ngày.</p>
          <button onClick={clearFilters}>Xóa bộ lọc</button>
        </div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <table className={styles.registrationTable}>
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả trang này"
                      disabled={bulk.isPending || !selectable.length}
                      checked={
                        !!selectable.length &&
                        selectable.every((group) => selected.includes(group.id))
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...new Set([...selected, ...selectable.map((group) => group.id)])]
                            : selected.filter((id) => !selectable.some((group) => group.id === id)),
                        )
                      }
                    />
                  </th>
                  <th>Mã</th>
                  <th>Khách hàng / sản phẩm</th>
                  <th>SĐT</th>
                  <th className={styles.amount}>Tổng tiền</th>
                  <th>Số SP</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>
                    <span className={styles.srOnly}>Chi tiết</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((group) => (
                  <tr
                    key={group.id}
                    tabIndex={0}
                    aria-label={`Mở đăng ký ${group.code || group.id}`}
                    onClick={(event) => open(group, event.currentTarget)}
                    onKeyDown={(event) => rowKey(event, group)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>{checkbox(group)}</td>
                    <td>{group.code || `#${group.id}`}</td>
                    <td>
                      <strong>{group.customer_name}</strong>
                      {products(group)}
                    </td>
                    <td>{phone(group)}</td>
                    <td className={styles.amount}>{money(group.total_amount)}</td>
                    <td>{group.items.length}</td>
                    <td>{created(group)}</td>
                    <td>{badge(group)}</td>
                    <td>
                      <button
                        className={styles.iconButton}
                        aria-label={`Xem ${group.code || group.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          open(group, event.currentTarget);
                        }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileList}>
            {visible.map((group) => (
              <article
                key={group.id}
                className={styles.appointmentCard}
                tabIndex={0}
                aria-label={`Mở đăng ký ${group.code || group.id}`}
                onClick={(event) => open(group, event.currentTarget)}
                onKeyDown={(event) => rowKey(event, group)}
              >
                <div className={styles.cardHeading}>
                  <div className={styles.cardName}>
                    <span>{group.code || `#${group.id}`}</span>
                    <strong>{group.customer_name}</strong>
                  </div>
                  {checkbox(group)}
                </div>
                {products(group)}
                {phone(group)}
                <div className={styles.cardFooter}>
                  <span>{group.items.length} sản phẩm</span>
                  <strong>{money(group.total_amount)}</strong>
                </div>
                {created(group)}
                {badge(group)}
              </article>
            ))}
          </div>
          <footer className={styles.listFooter}>
            <span className={styles.resultCount}>{filtered.length} kết quả</span>
            <label className={styles.pageSize}>
              Số dòng
              <select
                aria-label="Số dòng"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              >
                {[10, 20, 50].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <Pagination
              page={actualPage}
              pageSize={size}
              total={filtered.length}
              onPageChange={setPage}
            />
          </footer>
        </>
      )}
      {!!selected.length && (
        <div className={styles.bulkBar} role="region" aria-label="Thao tác đã chọn">
          <strong>Đã chọn {selected.length}</strong>
          <select
            className={styles.bulkSelect}
            aria-label="Trạng thái hàng loạt"
            value={validBulk ? targetStatus : ''}
            disabled={bulk.isPending}
            onChange={(event) => setTargetStatus(event.target.value as RegistrationStatus)}
          >
            <option value="">Chọn trạng thái</option>
            {bulkOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className={styles.saveButton}
            disabled={!validBulk || bulk.isPending}
            onClick={() => {
              setBulkNote('');
              setConfirmBulk(true);
            }}
          >
            Đổi trạng thái
          </button>
          <button
            className={styles.secondaryButton}
            disabled={bulk.isPending}
            onClick={() => setSelected([])}
          >
            Bỏ chọn
          </button>
          {!bulkOptions.length && (
            <p className={styles.warningText}>
              Các đăng ký đã chọn không có trạng thái đích chung hợp lệ.
            </p>
          )}
        </div>
      )}
      {detail && (
        <RegistrationDetail
          target={detail}
          admin={admin}
          onClose={close}
          onSaved={() => {
            void cache.invalidateQueries({ queryKey: ['admin-registrations'] });
          }}
        />
      )}
      {confirmBulk && (
        <Modal
          isOpen
          onClose={() => {
            if (!bulk.isPending) setConfirmBulk(false);
          }}
          title="Xác nhận đổi trạng thái"
          maxWidth="md"
        >
          <div className={styles.detailContent}>
            <p>
              Chuyển {selectedGroups.filter((group) => group.status !== targetStatus).length} đăng
              ký sang <strong>{targetStatus && registrationStatusLabel(targetStatus)}</strong>?
            </p>
            <p className={styles.infoText}>Các đăng ký đã ở trạng thái này sẽ được giữ nguyên.</p>
            <label className={styles.formField}>
              <span>{targetStatus === 'huy' ? 'Lý do hủy (bắt buộc)' : 'Ghi chú xử lý'}</span>
              <textarea
                className={styles.textArea}
                maxLength={1000}
                rows={3}
                value={bulkNote}
                disabled={bulk.isPending}
                onChange={(event) => setBulkNote(event.target.value)}
              />
            </label>
            <footer className={styles.modalFooter}>
              <button
                className={styles.secondaryButton}
                disabled={bulk.isPending}
                onClick={() => setConfirmBulk(false)}
              >
                Đóng
              </button>
              <button
                className={styles.saveButton}
                disabled={
                  bulk.isPending || !validBulk || (targetStatus === 'huy' && !bulkNote.trim())
                }
                onClick={() => bulk.mutate()}
              >
                {bulk.isPending && <LoaderCircle className={styles.spinning} />}Xác nhận
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
