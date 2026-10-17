'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  Clipboard,
  Clock3,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { appointmentsApi } from '@/lib/api/appointments';
import { shiftsApi } from '@/lib/api/shifts';
import { storesApi } from '@/lib/api/stores';
import { AppointmentStatus, StoreAppointment } from '@/types/appointment';
import { WorkShift } from '@/types/user';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.scss';

const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đã xác nhận' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'huy', label: 'Đã hủy' },
];
const STATUS_CLASS: Record<AppointmentStatus, string> = {
  moi: styles.statusNew,
  dang_xu_ly: styles.statusConfirmed,
  hoan_thanh: styles.statusDone,
  huy: styles.statusCancelled,
};
const STATUS_FILTERS: Array<{ value: 'all' | AppointmentStatus; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đã xác nhận' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'huy', label: 'Đã hủy' },
];

function todayVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00+07:00`);
  value.setDate(value.getDate() + amount);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function appointmentTimestamp(appointment: StoreAppointment) {
  return new Date(
    `${appointment.appointment_date.slice(0, 10)}T${appointment.appointment_time.slice(0, 5)}:00+07:00`,
  ).getTime();
}

function friendlyDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date.slice(0, 10)}T12:00:00+07:00`));
}

function relativeDay(appointment: StoreAppointment, now: number, today: string) {
  const date = appointment.appointment_date.slice(0, 10);
  if (appointment.status === 'moi' && appointmentTimestamp(appointment) < now) return 'Quá hạn';
  if (date === today) return 'Hôm nay';
  if (date === addDays(today, 1)) return 'Ngày mai';
  return null;
}

function shiftMatches(shift: WorkShift, appointment: StoreAppointment) {
  return (
    shift.shift_date.slice(0, 10) === appointment.appointment_date.slice(0, 10) &&
    (shift.store_id === null || shift.store_id === appointment.store_id) &&
    shift.start_time.slice(0, 5) <= appointment.appointment_time.slice(0, 5) &&
    shift.end_time.slice(0, 5) >= appointment.appointment_time.slice(0, 5) &&
    Boolean(shift.staff)
  );
}

export default function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [detail, setDetail] = useState<StoreAppointment | null>(null);
  const [statusDraft, setStatusDraft] = useState<AppointmentStatus>('moi');
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'range'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortDirection, setSortDirection] = useState<'priority' | 'asc' | 'desc'>('priority');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const rowRefs = useRef(new Map<number, HTMLElement>());
  const returnFocusId = useRef<number | null>(null);
  const today = todayVietnam();
  const now = Date.now();

  const appointmentsQuery = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: appointmentsApi.list,
  });
  const storesQuery = useQuery({
    queryKey: ['admin-stores'],
    queryFn: storesApi.listAdmin,
  });
  const shiftsQuery = useQuery({
    queryKey: ['admin-shifts'],
    queryFn: shiftsApi.list,
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const allAppointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, storeFilter, dateFilter, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    if (!detail) {
      const id = returnFocusId.current;
      if (id !== null) requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
      return;
    }
    setStatusDraft(detail.status);
    setAssigneeDraft(detail.assigned_to === null ? '' : String(detail.assigned_to));
  }, [detail]);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      assigned_to,
    }: {
      id: number;
      status: AppointmentStatus;
      assigned_to?: number | null;
    }) => appointmentsApi.updateStatus(id, { status, assigned_to }),
    onSuccess: (updated) => {
      queryClient.setQueryData<StoreAppointment[]>(['admin-appointments'], (current) =>
        current?.map((appointment) => (appointment.id === updated.id ? updated : appointment)),
      );
      setDetail(updated);
      showToast('Đã lưu thay đổi lịch hẹn');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const filteredAppointments = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    const rangeStart = dateFilter === 'today' ? today : dateFilter === 'week' ? today : dateFrom;
    const rangeEnd =
      dateFilter === 'today' ? today : dateFilter === 'week' ? addDays(today, 6) : dateTo;
    return allAppointments
      .filter((appointment) => {
        const date = appointment.appointment_date.slice(0, 10);
        const storeName = appointment.store?.name ?? `#${appointment.store_id}`;
        return (
          (!needle ||
            appointment.customer_name.toLocaleLowerCase('vi').includes(needle) ||
            appointment.phone.toLocaleLowerCase('vi').includes(needle)) &&
          (statusFilter === 'all' || appointment.status === statusFilter) &&
          (storeFilter === 'all' || String(appointment.store_id) === storeFilter) &&
          (dateFilter === 'all' ||
            ((!rangeStart || date >= rangeStart) && (!rangeEnd || date <= rangeEnd)))
        );
      })
      .sort((a, b) => {
        const timeA = appointmentTimestamp(a);
        const timeB = appointmentTimestamp(b);
        if (sortDirection === 'priority') {
          const rankA = a.status === 'moi' && timeA >= now ? 0 : 1;
          const rankB = b.status === 'moi' && timeB >= now ? 0 : 1;
          if (rankA !== rankB) return rankA - rankB;
        }
        return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [
    allAppointments,
    dateFilter,
    dateFrom,
    dateTo,
    now,
    search,
    sortDirection,
    statusFilter,
    storeFilter,
    today,
  ]);

  const visibleAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(
    search || statusFilter !== 'all' || storeFilter !== 'all' || dateFilter !== 'all',
  );
  const dirty = Boolean(
    detail &&
      (statusDraft !== detail.status ||
        (isAdmin &&
          (assigneeDraft || '') !==
            (detail.assigned_to === null ? '' : String(detail.assigned_to)))),
  );

  function openDetail(appointment: StoreAppointment) {
    returnFocusId.current = appointment.id;
    setDetail(appointment);
  }

  function closeDetail() {
    if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng mà không lưu?')) return;
    setDetail(null);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, appointment: StoreAppointment) {
    if ((event.target as HTMLElement).closest('a, button, input, select')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetail(appointment);
    }
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      showToast('Đã sao chép số điện thoại');
    } catch {
      showToast('Không thể sao chép số điện thoại', 'error');
    }
  }

  function saveDetail() {
    if (!detail || !dirty) return;
    if (
      statusDraft === 'huy' &&
      detail.status !== 'huy' &&
      !window.confirm('Xác nhận hủy lịch hẹn này?')
    ) {
      return;
    }
    updateMutation.mutate({
      id: detail.id,
      status: statusDraft,
      ...(isAdmin ? { assigned_to: assigneeDraft ? Number(assigneeDraft) : null } : {}),
    });
  }

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setStoreFilter('all');
    setDateFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  function renderPhone(phone: string) {
    return (
      <span className={styles.phoneCell}>
        <a href={`tel:${phone}`} onClick={(event) => event.stopPropagation()}>
          {phone}
        </a>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Sao chép số ${phone}`}
          title="Sao chép số điện thoại"
          onClick={(event) => {
            event.stopPropagation();
            void copyPhone(phone);
          }}
        >
          <Clipboard aria-hidden="true" />
        </button>
      </span>
    );
  }

  function renderAppointmentTime(appointment: StoreAppointment) {
    const relative = relativeDay(appointment, now, today);
    return (
      <span className={styles.timeCell}>
        <strong>{appointment.appointment_time.slice(0, 5)}</strong>
        <span>{friendlyDate(appointment.appointment_date)}</span>
        {relative && (
          <span className={`${styles.dayBadge} ${relative === 'Quá hạn' ? styles.overdue : ''}`}>
            {relative}
          </span>
        )}
      </span>
    );
  }

  function renderAssignee(appointment: StoreAppointment) {
    if (appointment.assignee?.full_name) return <span>{appointment.assignee.full_name}</span>;
    return (
      <button
        type="button"
        className={styles.assignButton}
        disabled={!isAdmin}
        onClick={(event) => {
          event.stopPropagation();
          openDetail(appointment);
        }}
      >
        Gán
      </button>
    );
  }

  const currentShifts = shiftsQuery.data ?? [];
  const matchingShifts = detail ? currentShifts.filter((shift) => shiftMatches(shift, detail)) : [];
  const distinctStaff: Array<{ id: number; full_name: string }> = Array.from(
    new Map(
      matchingShifts.map((shift) => [
        shift.user_id,
        { id: shift.staff!.id, full_name: shift.staff!.full_name },
      ]),
    ).values(),
  );
  const currentAssignee = detail?.assignee;
  if (currentAssignee && !distinctStaff.some((staff) => staff.id === currentAssignee.id)) {
    distinctStaff.unshift(currentAssignee);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VẬN HÀNH · CỬA HÀNG</p>
          <h1 className={styles.title}>Lịch hẹn đến cửa hàng</h1>
          <p className={styles.total}>{allAppointments.length} lịch hẹn</p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void appointmentsQuery.refetch()}
          disabled={appointmentsQuery.isFetching}
        >
          <RefreshCw className={appointmentsQuery.isFetching ? styles.spinning : ''} />
          Làm mới
        </button>
      </header>

      <nav className={styles.statusTabs} aria-label="Lọc theo trạng thái">
        {STATUS_FILTERS.map(({ value, label }) => {
          const count =
            value === 'all'
              ? allAppointments.length
              : allAppointments.filter((appointment) => appointment.status === value).length;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              className={statusFilter === value ? styles.activeTab : ''}
              onClick={() => setStatusFilter(value)}
            >
              {label}
              <span>{count}</span>
            </button>
          );
        })}
      </nav>

      <section className={styles.toolbar} aria-label="Bộ lọc lịch hẹn">
        <label className={styles.searchField}>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên hoặc số điện thoại"
            aria-label="Tìm theo tên hoặc số điện thoại"
          />
        </label>
        <label className={styles.filterField}>
          <span>Cửa hàng</span>
          <select value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}>
            <option value="all">Tất cả cửa hàng</option>
            {(storesQuery.data ?? []).map((store) => (
              <option key={store.id} value={String(store.id)}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span>Ngày</span>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}
          >
            <option value="all">Mọi ngày</option>
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày tới</option>
            <option value="range">Chọn khoảng</option>
          </select>
        </label>
        {dateFilter === 'range' && (
          <div className={styles.dateRange}>
            <label>
              <span>Từ</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label>
              <span>Đến</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
          </div>
        )}
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
          aria-label={
            sortDirection === 'priority'
              ? 'Đang ưu tiên lịch mới và sắp tới; bấm để sắp xếp theo thời gian'
              : `Sắp xếp theo thời gian ${sortDirection === 'desc' ? 'giảm dần' : 'tăng dần'}`
          }
          title="Đổi thứ tự thời gian"
        >
          <Clock3 aria-hidden="true" />
          {sortDirection === 'priority'
            ? 'Ưu tiên lịch mới'
            : `Thời gian ${sortDirection === 'desc' ? 'mới nhất' : 'sớm nhất'}`}
        </button>
      </section>

      {appointmentsQuery.isError ? (
        <div className={styles.errorState} role="alert">
          <p>Không tải được danh sách lịch hẹn.</p>
          <button type="button" onClick={() => void appointmentsQuery.refetch()}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {visibleAppointments.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays aria-hidden="true" />
              <h2>
                {allAppointments.length === 0 ? 'Chưa có lịch hẹn' : 'Không tìm thấy lịch hẹn'}
              </h2>
              <p>
                {allAppointments.length === 0
                  ? 'Lịch khách đặt sẽ xuất hiện tại đây.'
                  : 'Thử thay đổi điều kiện tìm kiếm hoặc bộ lọc.'}
              </p>
              {hasFilters && (
                <button type="button" onClick={resetFilters}>
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Cửa hàng</th>
                      <th>Thời gian</th>
                      <th>Giao dịch viên</th>
                      <th>Trạng thái</th>
                      <th>
                        <span className={styles.srOnly}>Chi tiết</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        ref={(element) => {
                          if (element) rowRefs.current.set(appointment.id, element);
                          else rowRefs.current.delete(appointment.id);
                        }}
                        tabIndex={0}
                        aria-label={`Mở lịch hẹn của ${appointment.customer_name}`}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('a, button, input, select'))
                            return;
                          openDetail(appointment);
                        }}
                        onKeyDown={(event) => handleRowKeyDown(event, appointment)}
                      >
                        <td className={styles.customerCell}>
                          <strong>{appointment.customer_name}</strong>
                          {appointment.email && <span>{appointment.email}</span>}
                        </td>
                        <td>{renderPhone(appointment.phone)}</td>
                        <td>{appointment.store?.name ?? `#${appointment.store_id}`}</td>
                        <td>{renderAppointmentTime(appointment)}</td>
                        <td>{renderAssignee(appointment)}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${STATUS_CLASS[appointment.status]}`}
                          >
                            <i aria-hidden="true" />
                            {
                              STATUS_OPTIONS.find((option) => option.value === appointment.status)
                                ?.label
                            }
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.viewButton}
                            aria-label={`Xem lịch hẹn ${appointment.customer_name}`}
                            onClick={() => openDetail(appointment)}
                          >
                            <span aria-hidden="true">›</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.mobileList}>
                {visibleAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    ref={(element) => {
                      if (element) rowRefs.current.set(appointment.id, element);
                      else rowRefs.current.delete(appointment.id);
                    }}
                    className={styles.appointmentCard}
                    tabIndex={0}
                    role="button"
                    aria-label={`Mở lịch hẹn của ${appointment.customer_name}`}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('a, button, input, select')) return;
                      openDetail(appointment);
                    }}
                    onKeyDown={(event) => handleRowKeyDown(event, appointment)}
                  >
                    <div className={styles.cardHeading}>
                      <div>
                        <strong>{appointment.customer_name}</strong>
                        <span>{appointment.store?.name ?? `#${appointment.store_id}`}</span>
                      </div>
                      <span className={`${styles.statusBadge} ${STATUS_CLASS[appointment.status]}`}>
                        <i aria-hidden="true" />
                        {
                          STATUS_OPTIONS.find((option) => option.value === appointment.status)
                            ?.label
                        }
                      </span>
                    </div>
                    <div className={styles.cardTime}>{renderAppointmentTime(appointment)}</div>
                    <div className={styles.cardFooter}>
                      {renderPhone(appointment.phone)}
                      {renderAssignee(appointment)}
                    </div>
                  </article>
                ))}
              </div>

              <footer className={styles.listFooter}>
                <label className={styles.pageSize}>
                  <span>Số dòng</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={styles.resultCount}>
                  {filteredAppointments.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filteredAppointments.length)} /{' '}
                  {filteredAppointments.length}
                </span>
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredAppointments.length}
                  onPageChange={setPage}
                />
              </footer>
            </>
          )}
        </>
      )}

      <Modal isOpen={detail !== null} onClose={closeDetail} title="Chi tiết lịch hẹn" maxWidth="xl">
        {detail && (
          <div className={styles.detailContent}>
            <section className={styles.detailSection}>
              <h3>Khách hàng</h3>
              <dl className={styles.detailGrid}>
                <div>
                  <dt>Họ tên</dt>
                  <dd>{detail.customer_name}</dd>
                </div>
                <div>
                  <dt>Số điện thoại</dt>
                  <dd>{detail.phone}</dd>
                </div>
                {detail.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>{detail.email}</dd>
                  </div>
                )}
                {detail.note && (
                  <div className={styles.fullRow}>
                    <dt>Ghi chú / yêu cầu</dt>
                    <dd className={styles.customerNote}>{detail.note}</dd>
                  </div>
                )}
              </dl>
              <div className={styles.contactActions}>
                <a href={`tel:${detail.phone}`}>
                  <Phone aria-hidden="true" /> Gọi
                </a>
                <button type="button" onClick={() => void copyPhone(detail.phone)}>
                  <Clipboard aria-hidden="true" /> Sao chép
                </button>
              </div>
            </section>

            <section className={styles.detailSection}>
              <h3>Lịch hẹn</h3>
              <dl className={styles.detailGrid}>
                <div>
                  <dt>Cửa hàng</dt>
                  <dd>{detail.store?.name ?? `#${detail.store_id}`}</dd>
                </div>
                {detail.store?.address && (
                  <div>
                    <dt>Địa chỉ</dt>
                    <dd>{detail.store.address}</dd>
                  </div>
                )}
                <div>
                  <dt>Ngày</dt>
                  <dd>{friendlyDate(detail.appointment_date)}</dd>
                </div>
                <div>
                  <dt>Giờ</dt>
                  <dd>{detail.appointment_time.slice(0, 5)}</dd>
                </div>
                <div className={styles.fullRow}>
                  <dt>Khách tạo lịch</dt>
                  <dd>
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    }).format(new Date(detail.created_at))}
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.detailSection}>
              <h3>Xử lý</h3>
              <fieldset className={styles.statusFieldset}>
                <legend>Trạng thái</legend>
                <div className={styles.statusSegments}>
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={statusDraft === value}
                      className={`${styles.segment} ${statusDraft === value ? STATUS_CLASS[value] : ''}`}
                      disabled={updateMutation.isPending}
                      onClick={() => setStatusDraft(value)}
                    >
                      <i aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {isAdmin ? (
                <label className={styles.formField}>
                  <span>Giao dịch viên phụ trách</span>
                  <select
                    value={assigneeDraft}
                    onChange={(event) => setAssigneeDraft(event.target.value)}
                  >
                    <option value="">Chưa phân công</option>
                    {distinctStaff.map((staff) => (
                      <option key={staff.id} value={String(staff.id)}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                  <small>
                    {shiftsQuery.isLoading
                      ? 'Đang tải ca trực...'
                      : matchingShifts.length
                        ? 'Nhân viên đang trực tại cửa hàng trong khung giờ này.'
                        : 'Không có ca trực khớp cửa hàng và khung giờ.'}
                  </small>
                </label>
              ) : (
                <div className={styles.infoRow}>
                  <span>Giao dịch viên phụ trách</span>
                  <strong>{detail.assignee?.full_name ?? 'Chưa phân công'}</strong>
                </div>
              )}
              <div className={styles.unavailableField}>
                <strong>Ghi chú nội bộ</strong>
                <p>
                  Chưa có trường lưu ghi chú nội bộ. Ghi chú hiện có là yêu cầu của khách và sẽ
                  không bị ghi đè.
                </p>
              </div>
            </section>

            <section className={styles.detailSection}>
              <h3>Email xác nhận</h3>
              {detail.email ? (
                <>
                  <p className={styles.infoText}>
                    <Mail aria-hidden="true" /> Nhật ký email chưa liên kết được với từng lịch hẹn
                    nên chưa thể xác minh trạng thái gửi.
                  </p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled
                    title="Cần API gửi lại email theo lịch hẹn"
                  >
                    Gửi lại email xác nhận
                  </button>
                </>
              ) : (
                <p className={styles.infoText}>Khách không để lại email.</p>
              )}
            </section>

            <section className={styles.detailSection}>
              <h3>Lịch sử xử lý</h3>
              <p className={styles.infoText}>Chưa có API lịch sử trạng thái theo từng lịch hẹn.</p>
            </section>

            <footer className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeDetail}
                disabled={updateMutation.isPending}
              >
                <X aria-hidden="true" /> Đóng
              </button>
              <button
                type="button"
                className={styles.saveButton}
                onClick={saveDetail}
                disabled={!dirty || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <LoaderCircle className={styles.spinning} aria-hidden="true" />
                ) : updateMutation.isSuccess && !dirty ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </main>
  );
}
