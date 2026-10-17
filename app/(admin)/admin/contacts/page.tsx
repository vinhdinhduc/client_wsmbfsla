'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clipboard, Eye, LoaderCircle, Mail, RefreshCw, Search } from 'lucide-react';
import { contactsApi } from '@/lib/api/contacts';
import { usersApi } from '@/lib/api/users';
import { auditLogsApi } from '@/lib/api/auditLogs';
import { ContactMessage, ContactStatus } from '@/types/order';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import shared from '../appointments/page.module.scss';
import local from './page.module.scss';
const styles = { ...shared, ...local };
const OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'moi', label: 'Mới' },
  { value: 'da_phan_hoi', label: 'Đã phản hồi' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
];
const CONTACT_WAIT_HOURS = 24;
const CONTACT_OVERDUE_HOURS = 72;
const label = (status: ContactStatus) => OPTIONS.find((s) => s.value === status)?.label ?? status;
const dateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
function timestamp(value: string) {
  const date = new Date(value);
  return `${date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}
function relative(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  return minutes < 1
    ? 'Vừa xong'
    : minutes < 60
      ? `${minutes} phút trước`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} giờ trước`
        : `${Math.floor(minutes / 1440)} ngày trước`;
}
async function loadContacts() {
  const items: ContactMessage[] = [];
  for (let page = 1; ; page++) {
    const result = await contactsApi.list({ page, page_size: 100 });
    items.push(...result.items);
    if (items.length >= result.total || !result.items.length) break;
  }
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
export default function AdminContactsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-contacts'], queryFn: loadContacts });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('priority');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<ContactMessage | null>(null);
  const [status, setStatus] = useState<ContactStatus>('moi');
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());
  const opener = useRef<HTMLElement | null>(null);
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.list,
    enabled: !!detail && isAdmin,
  });
  const history = useQuery({
    queryKey: ['contact-history', detail?.id],
    queryFn: () => auditLogsApi.list({ module: 'contacts', page_size: 100 }),
    enabled: !!detail && isAdmin,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [search, statusFilter, dateFilter, from, to, size]);
  const all = useMemo(() => query.data ?? [], [query.data]);
  const invalidRange = dateFilter === 'range' && !!from && !!to && from > to;
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    const today = dateKey(new Date(now));
    const start =
      dateFilter === 'today'
        ? today
        : dateFilter === '7' || dateFilter === '30'
          ? dateKey(new Date(now - (Number(dateFilter) - 1) * 86400000))
          : from;
    return all
      .filter((c) => {
        const day = dateKey(new Date(c.created_at));
        return (
          !invalidRange &&
          (statusFilter === 'all' || c.status === statusFilter) &&
          (!term ||
            [c.name, c.phone, c.email, c.message].some((v) =>
              v?.toLocaleLowerCase('vi').includes(term),
            )) &&
          (dateFilter === 'all' ||
            ((!start || day >= start) &&
              (!(dateFilter === 'range' ? to : today) ||
                day <= (dateFilter === 'range' ? to : today))))
        );
      })
      .sort(
        (a, b) =>
          (sort === 'priority' ? Number(b.status === 'moi') - Number(a.status === 'moi') : 0) ||
          (sort === 'asc' ? 1 : -1) * (Date.parse(a.created_at) - Date.parse(b.created_at)) ||
          b.id - a.id,
      );
  }, [all, search, statusFilter, dateFilter, from, to, sort, now, invalidRange]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const dirty =
    !!detail &&
    (status !== detail.status ||
      assignee !== String(detail.assigned_to ?? '') ||
      note !== (detail.internal_note ?? ''));
  const save = useMutation({
    mutationFn: () =>
      contactsApi.update(detail!.id, {
        status,
        internal_note: note,
        ...(isAdmin ? { assigned_to: assignee ? Number(assignee) : null } : {}),
      }),
    onSuccess: (updated) => {
      setDetail(updated);
      setStatus(updated.status);
      setNote(updated.internal_note ?? '');
      setAssignee(String(updated.assigned_to ?? ''));
      void queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['contact-history'] });
      showToast('Đã lưu liên hệ');
    },
    onError: () => showToast('Không thể lưu liên hệ. Vui lòng thử lại.', 'error'),
  });
  const bulk = useMutation({
    mutationFn: async (ids: number[]) => {
      const failed: number[] = [];
      for (const id of ids) {
        try {
          await contactsApi.updateStatus(id, 'da_phan_hoi');
        } catch {
          failed.push(id);
        }
      }
      return { failed, total: ids.length };
    },
    onSuccess: ({ failed, total }) => {
      setSelected(failed);
      void queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      showToast(
        failed.length
          ? `Đã cập nhật ${total - failed.length}/${total} liên hệ. Có ${failed.length} liên hệ cần thử lại.`
          : `Đã cập nhật ${total} liên hệ`,
        failed.length ? 'error' : 'success',
      );
    },
  });
  function open(c: ContactMessage, element: HTMLElement) {
    opener.current = element;
    element.focus();
    setDetail(c);
    setStatus(c.status);
    setAssignee(String(c.assigned_to ?? ''));
    setNote(c.internal_note ?? '');
  }
  function close() {
    if (
      save.isPending ||
      (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng và bỏ thay đổi?'))
    )
      return;
    setDetail(null);
    setTimeout(() => opener.current?.focus(), 200);
  }
  function mark(ids: number[]) {
    if (ids.length && window.confirm(`Đánh dấu ${ids.length} liên hệ đã phản hồi?`))
      bulk.mutate(ids);
  }
  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }
  function reset() {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setFrom('');
    setTo('');
    setPage(1);
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Đã sao chép');
    } catch {
      showToast('Không thể sao chép. Vui lòng sao chép thủ công.', 'error');
    }
  }
  function contactLink(value: string, type: 'phone' | 'email', full = false) {
    if (!value) return <span>Chưa có {type === 'phone' ? 'SĐT' : 'email'}</span>;
    return (
      <span className={styles.contactLine} onClick={(e) => e.stopPropagation()}>
        <a href={`${type === 'phone' ? 'tel' : 'mailto'}:${value}`}>{value}</a>
        {full && (
          <a href={`${type === 'phone' ? 'tel' : 'mailto'}:${value}`}>
            {type === 'phone' ? 'Gọi' : 'Gửi mail'}
          </a>
        )}
        <button
          className={full ? styles.iconButton : styles.copyButton}
          aria-label={`Sao chép ${type === 'phone' ? 'SĐT' : 'email'}`}
          onClick={() => void copy(value)}
        >
          <Clipboard size={14} />
        </button>
      </span>
    );
  }
  function badge(c: ContactMessage) {
    const hours = (now - Date.parse(c.created_at)) / 3600000;
    return (
      <div className={styles.badges}>
        {c.source === 'chatbot' && <span className={styles.statusBadge}>Nguồn: chatbot</span>}
        <span
          className={`${styles.statusBadge} ${c.status === 'moi' ? styles.statusNew : c.status === 'da_phan_hoi' ? styles.statusConfirmed : styles.statusDone}`}
        >
          <i />
          {label(c.status)}
        </span>
        {c.status === 'moi' && hours > CONTACT_WAIT_HOURS && (
          <span
            className={`${styles.statusBadge} ${hours > CONTACT_OVERDUE_HOURS ? styles.late : styles.waiting}`}
          >
            {hours > CONTACT_OVERDUE_HOURS ? 'Quá hạn' : `Chờ xử lý ${Math.floor(hours / 24)} ngày`}
          </span>
        )}
      </div>
    );
  }
  function sent(c: ContactMessage) {
    return (
      <time
        dateTime={c.created_at}
        title={new Date(c.created_at).toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          dateStyle: 'full',
          timeStyle: 'long',
        })}
      >
        {timestamp(c.created_at)}
        <small className={styles.subline}>{relative(c.created_at, now)}</small>
      </time>
    );
  }
  function actions(c: ContactMessage) {
    return (
      <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.iconButton}
          aria-label={`Xem liên hệ ${c.name}`}
          onClick={(e) => open(c, e.currentTarget)}
        >
          <Eye size={18} />
        </button>
        {c.status !== 'da_phan_hoi' && (
          <button
            className={styles.assignButton}
            disabled={bulk.isPending}
            onClick={() => mark([c.id])}
          >
            Đánh dấu đã phản hồi
          </button>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} aria-label="Trả lời qua email" title="Trả lời qua email">
            <Mail size={18} />
          </a>
        )}
      </div>
    );
  }
  const selectable = visible.filter((c) => c.status !== 'da_phan_hoi');
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Danh sách liên hệ</h1>
        <p className={styles.total}>{all.length} liên hệ</p>
      </header>
      <nav className={styles.statusTabs} aria-label="Lọc trạng thái">
        {[
          { value: 'all', label: 'Tất cả' },
          ...OPTIONS.filter(
            (o) => o.value !== 'dang_xu_ly' || all.some((c) => c.status === 'dang_xu_ly'),
          ),
        ].map((o) => (
          <button
            key={o.value}
            className={statusFilter === o.value ? styles.activeTab : ''}
            aria-pressed={statusFilter === o.value}
            onClick={() => setStatusFilter(o.value)}
          >
            {o.label}
            <span>
              {o.value === 'all' ? all.length : all.filter((c) => c.status === o.value).length}
            </span>
          </button>
        ))}
      </nav>
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          Tìm kiếm
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, SĐT, email, nội dung"
          />
        </label>
        <label className={styles.filterField}>
          Ngày gửi
          <select aria-label="Ngày gửi" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">Tất cả ngày</option>
            <option value="today">Hôm nay</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
            <option value="range">Chọn khoảng</option>
          </select>
        </label>
        {dateFilter === 'range' && (
          <div className={styles.dateRange}>
            <label>
              Từ ngày
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}
        <button
          className={styles.refreshButton}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={query.isFetching ? styles.spinning : ''} />
          Làm mới
        </button>
      </div>
      {invalidRange && <p role="alert">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
      <label className={styles.pageSize}>
        Sắp xếp
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="priority">Mới trước, thời gian mới nhất</option>
          <option value="desc">Ngày gửi mới nhất</option>
          <option value="asc">Ngày gửi cũ nhất</option>
        </select>
      </label>
      {query.isLoading ? (
        <p role="status">Đang tải liên hệ…</p>
      ) : query.isError ? (
        <div className={styles.errorState} role="alert">
          Không thể tải liên hệ.<button onClick={() => void query.refetch()}>Thử lại</button>
        </div>
      ) : !filtered.length ? (
        <div className={styles.emptyState}>
          <Mail />
          <h2>Chưa có liên hệ phù hợp</h2>
          <p>Liên hệ của khách sẽ xuất hiện tại đây.</p>
          <button onClick={reset}>Xóa bộ lọc</button>
        </div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <table className={styles.contactTable}>
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '23%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả trang này"
                      disabled={bulk.isPending || !selectable.length}
                      checked={
                        !!selectable.length && selectable.every((c) => selected.includes(c.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...new Set([...selected, ...selectable.map((c) => c.id)])]
                            : selected.filter((id) => !selectable.some((c) => c.id === id)),
                        )
                      }
                    />
                  </th>
                  <th>Người gửi</th>
                  <th>Nội dung</th>
                  <th
                    aria-sort={
                      sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
                    }
                  >
                    <button
                      className={styles.sortButton}
                      onClick={() => {
                        setSort(sort === 'desc' ? 'asc' : 'desc');
                        setPage(1);
                      }}
                    >
                      Ngày gửi {sort === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={(e) => open(c, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) {
                        e.preventDefault();
                        open(c, e.currentTarget);
                      }
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${c.name}`}
                        checked={selected.includes(c.id)}
                        disabled={bulk.isPending || c.status === 'da_phan_hoi'}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td>
                      <strong>{c.name}</strong>
                      {contactLink(c.phone, 'phone')}
                      {contactLink(c.email, 'email')}
                    </td>
                    <td>
                      <span className={styles.excerpt}>{c.message}</span>
                    </td>
                    <td>{sent(c)}</td>
                    <td>{badge(c)}</td>
                    <td>{actions(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileList}>
            {visible.map((c) => (
              <article
                key={c.id}
                className={styles.appointmentCard}
                tabIndex={0}
                onClick={(e) => open(c, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) {
                    e.preventDefault();
                    open(c, e.currentTarget);
                  }
                }}
              >
                <div className={styles.cardHeading}>
                  <strong>{c.name}</strong>
                  <span onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${c.name}`}
                      disabled={bulk.isPending || c.status === 'da_phan_hoi'}
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </span>
                </div>
                {contactLink(c.phone, 'phone')}
                {contactLink(c.email, 'email')}
                <p className={styles.excerpt}>{c.message}</p>
                {sent(c)}
                {badge(c)}
                {actions(c)}
              </article>
            ))}
          </div>
          <div className={styles.listFooter}>
            <span>{filtered.length} kết quả</span>
            <label className={styles.pageSize}>
              Số dòng
              <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {[10, 20, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Pagination
              page={currentPage}
              pageSize={size}
              total={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
      {!!selected.length && (
        <div className={styles.bulkBar} role="region" aria-label="Thao tác đã chọn">
          <strong>Đã chọn {selected.length}</strong>
          <button
            className={styles.saveButton}
            disabled={bulk.isPending}
            onClick={() => mark(selected)}
          >
            {bulk.isPending && <LoaderCircle className={styles.spinning} />}Đánh dấu đã phản hồi
          </button>
          <button
            className={styles.secondaryButton}
            disabled={bulk.isPending}
            onClick={() => setSelected([])}
          >
            Bỏ chọn
          </button>
        </div>
      )}
      <Modal isOpen={!!detail} onClose={close} title="Chi tiết liên hệ" maxWidth="xl">
        {detail && (
          <div className={styles.detailContent}>
            <section className={styles.detailSection}>
              <h3>Người gửi</h3>
              <dl className={styles.detailGrid}>
                <div>
                  <dt>Họ tên</dt>
                  <dd>
                    <strong>{detail.name}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Thời điểm gửi</dt>
                  <dd>{sent(detail)}</dd>
                </div>
                <div className={styles.fullRow}>
                  <dt>SĐT</dt>
                  <dd>{contactLink(detail.phone, 'phone', true)}</dd>
                </div>
                <div className={styles.fullRow}>
                  <dt>Email</dt>
                  <dd>{contactLink(detail.email, 'email', true)}</dd>
                </div>
              </dl>
            </section>
            <section className={styles.detailSection}>
              <h3>Nội dung liên hệ</h3>
              <div className={styles.message}>{detail.message}</div>
            </section>
            <section className={styles.detailSection}>
              <h3>Xử lý</h3>
              <fieldset className={styles.statusFieldset} disabled={save.isPending}>
                <legend>Trạng thái</legend>
                <div className={styles.statusSegments}>
                  {OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      className={styles.segment}
                      aria-pressed={status === o.value}
                      onClick={() => setStatus(o.value)}
                    >
                      <i />
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className={styles.formField}>
                <span>Người phụ trách</span>
                <select
                  disabled={!isAdmin || users.isLoading || users.isError || save.isPending}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Chưa phân công</option>
                  {assignee && !users.data?.some((u) => String(u.id) === assignee) && (
                    <option value={assignee}>Nhân viên #{assignee}</option>
                  )}
                  {users.data
                    ?.filter((u) => u.status === 'active' || String(u.id) === assignee)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                </select>
                {!isAdmin && <small>Danh sách nhân viên chỉ dành cho quản trị viên.</small>}
                {users.isError && <small>Không tải được danh sách nhân viên.</small>}
              </label>
              <label className={styles.formField}>
                <span>Ghi chú nội bộ</span>
                <textarea
                  className={styles.note}
                  rows={4}
                  maxLength={2000}
                  value={note}
                  disabled={save.isPending}
                  onChange={(e) => setNote(e.target.value)}
                />
                <small>{note.length}/2000 ký tự</small>
              </label>
            </section>
            <section className={styles.detailSection}>
              <h3>Trả lời khách</h3>
              {detail.email ? (
                <>
                  <a className={styles.secondaryButton} href={`mailto:${detail.email}`}>
                    Trả lời qua email
                  </a>
                  <p className={styles.infoText}>
                    Mở ứng dụng email. Chưa hỗ trợ gửi trực tiếp tại đây; sau khi trả lời, hãy cập
                    nhật trạng thái liên hệ.
                  </p>
                </>
              ) : (
                <p className={styles.infoText}>
                  Khách chưa có email. Vui lòng liên hệ qua điện thoại.
                </p>
              )}
            </section>
            <section className={styles.detailSection}>
              <h3>Email tự động</h3>
              <p className={styles.infoText}>
                Xác nhận cho khách (contact_received_customer): chưa thể đối chiếu trạng thái gửi.
              </p>
              <p className={styles.infoText}>
                Thông báo nhân viên (contact_new_staff): chưa thể đối chiếu trạng thái gửi.
              </p>
              <p className={styles.infoText}>
                Nhật ký hiện chưa cung cấp mã liên hệ để xác định đúng thư và gửi lại.
              </p>
              {isAdmin && <a href="/admin/email">Xem quản lý email</a>}
            </section>
            <section className={styles.detailSection}>
              <h3>Lịch sử xử lý</h3>
              <ol className={styles.timeline}>
                <li>Nhận liên hệ · {timestamp(detail.created_at)}</li>
                {history.data?.items
                  .filter((event) => event.target_id === detail.id && event.new_value?.status)
                  .map((event) => (
                    <li key={event.id}>
                      {label(event.new_value!.status as ContactStatus)} ·{' '}
                      {event.user?.full_name ?? 'Không rõ người cập nhật'} ·{' '}
                      {timestamp(event.created_at)}
                    </li>
                  ))}
              </ol>
              <p className={styles.infoText}>
                {isAdmin
                  ? history.isError
                    ? 'Không tải được lịch sử xử lý.'
                    : history.isLoading
                      ? 'Đang tải lịch sử…'
                      : 'Hiển thị các thay đổi có trong 100 nhật ký liên hệ gần nhất.'
                  : 'Nhật ký xử lý chỉ dành cho quản trị viên.'}
              </p>
            </section>
            <footer className={styles.modalFooter}>
              <button className={styles.secondaryButton} disabled={save.isPending} onClick={close}>
                Đóng
              </button>
              <button
                className={styles.saveButton}
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending && <LoaderCircle className={styles.spinning} />}Lưu
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  );
}

