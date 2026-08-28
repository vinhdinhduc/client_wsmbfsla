'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Newspaper, Smartphone, Mail, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ordersApi } from '@/lib/api/orders';
import { newsApi } from '@/lib/api/news';
import { simsApi } from '@/lib/api/sims';
import { contactsApi } from '@/lib/api/contacts';
import { shiftsApi } from '@/lib/api/shifts';
import { formatDate } from '@/lib/format';

function StatCard({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

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
    queryFn: () => simsApi.listAdmin(),
    enabled: isContentRole,
  });
  const { data: mySchedule } = useQuery({
    queryKey: ['dashboard-my-schedule'],
    queryFn: () => shiftsApi.mySchedule(),
    enabled: user?.role === 'giao_dich_vien' || user?.role === 'nhan_vien',
  });

  const publishedNews = news?.filter((n) => n.status === 'published').length ?? 0;
  const availableSims = sims?.filter((s) => s.status === 'available').length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-neutral-900">Tổng quan</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Đăng ký mới" value={newRegistrations?.total ?? '—'} />
        <StatCard icon={Mail} label="Liên hệ mới" value={newContacts?.total ?? '—'} />
        {isContentRole && <StatCard icon={Newspaper} label="Tin đã đăng" value={publishedNews} />}
        {isContentRole && <StatCard icon={Smartphone} label="Sim còn lại" value={availableSims} />}
      </div>

      {mySchedule && (
        <div className="rounded-lg border border-neutral-100 bg-white p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-neutral-900">
            <CalendarClock className="h-5 w-5" />
            Lịch trực của tôi
          </h2>
          {mySchedule.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Bạn chưa có lịch trực nào được xếp.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {mySchedule.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-900">{formatDate(s.shift_date)}</span>
                  <span className="text-neutral-500">
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
