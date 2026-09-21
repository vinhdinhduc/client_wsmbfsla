'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Newspaper, Smartphone, Mail, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi } from '@/lib/api/orders';
import { newsApi } from '@/lib/api/news';
import { simsApi } from '@/lib/api/sims';
import { contactsApi } from '@/lib/api/contacts';
import { shiftsApi } from '@/lib/api/shifts';
import { appointmentsApi } from '@/lib/api/appointments';
import { formatDate } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import styles from './page.module.scss';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isContentRole = user?.role === 'admin' || user?.role === 'chuyen_vien';

  const { data: newRegistrations } = useQuery({
    queryKey: ['dashboard-registrations'],
    queryFn: () => ordersApi.list({ status: 'moi', page_size: 1 }),
  });
  const { data: newContacts } = useQuery({
    queryKey: ['dashboard-contacts'],
    queryFn: () => contactsApi.list({ status: 'moi', page_size: 1 }),
  });
  const { data: news } = useQuery({
    queryKey: ['dashboard-news'],
    queryFn: () => newsApi.listAdmin(),
    enabled: isContentRole,
  });
  const { data: sims } = useQuery({
    queryKey: ['dashboard-sims'],
    queryFn: () => simsApi.listAdmin({ status: 'available', page_size: 1 }),
    enabled: isContentRole,
  });
  const { data: mySchedule } = useQuery({
    queryKey: ['dashboard-my-schedule'],
    queryFn: () => shiftsApi.mySchedule(),
    enabled: user?.role === 'giao_dich_vien' || user?.role === 'nhan_vien',
  });
  const { data: appointments } = useQuery({
    queryKey: ['dashboard-appointments'],
    queryFn: appointmentsApi.list,
    enabled:
      user?.role === 'admin' || user?.role === 'chuyen_vien' || user?.role === 'giao_dich_vien',
  });

  const publishedNews = news?.filter((n) => n.status === 'published').length ?? 0;
  const availableSims = sims?.total ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <div>
          <p className={styles.kicker}>Bảng điều khiển</p>
          <h1 className={styles.title}>Xin chào, {user?.full_name || 'quản trị viên'}.</h1>
          <p className={styles.description}>Đây là những gì đang diễn ra trên hệ thống hôm nay.</p>
        </div>
        <div className={styles.status}>
          <span /> Hệ thống đang hoạt động
        </div>
      </div>

      <div className={styles.grid}>
        <StatCard
          icon={ClipboardList}
          label="Đăng ký mới"
          value={newRegistrations?.total ?? '—'}
          tone="blue"
        />
        <StatCard icon={Mail} label="Liên hệ mới" value={newContacts?.total ?? '—'} tone="orange" />
        {(user?.role === 'admin' ||
          user?.role === 'chuyen_vien' ||
          user?.role === 'giao_dich_vien') && (
          <StatCard
            icon={CalendarClock}
            label="Lịch hẹn"
            value={appointments?.filter((a) => a.status === 'moi').length ?? '—'}
            tone="green"
          />
        )}
        {isContentRole && (
          <StatCard icon={Newspaper} label="Tin đã đăng" value={publishedNews} tone="green" />
        )}
        {isContentRole && (
          <StatCard icon={Smartphone} label="Sim còn lại" value={availableSims} tone="purple" />
        )}
      </div>

      {mySchedule && (
        <div className={styles.scheduleCard}>
          <h2 className={styles.scheduleHeader}>
            <CalendarClock className={styles.scheduleIcon} />
            Lịch trực của tôi
          </h2>
          {mySchedule.length === 0 ? (
            <p className={styles.emptyText}>Bạn chưa có lịch trực nào được xếp.</p>
          ) : (
            <ul className={styles.scheduleList}>
              {mySchedule.map((s) => (
                <li key={s.id} className={styles.scheduleItem}>
                  <span className={styles.scheduleDate}>{formatDate(s.shift_date)}</span>
                  <span className={styles.scheduleTime}>
                    {s.start_time} - {s.end_time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
