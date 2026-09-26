'use client';
import styles from '@/styles/service-pages.module.scss';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api/appointments';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';

function AppointmentManager() {
  const token = useSearchParams().get('token') ?? '';
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const appointment = useQuery({
    queryKey: ['manage-appointment', token],
    queryFn: () => appointmentsApi.manage(token),
    enabled: Boolean(token),
  });
  const storeId = appointment.data?.store_id;
  const slots = useQuery({
    queryKey: ['manage-appointment-slots', storeId, date],
    queryFn: () => appointmentsApi.slots(storeId!, date),
    enabled: Boolean(storeId && date),
  });
  const change = useMutation({
    mutationFn: () => appointmentsApi.reschedule(token, date, time),
    onSuccess: (item) => {
      setMessage(`Đã đổi lịch ${item.code ?? ''} sang ${date} lúc ${time}.`);
      appointment.refetch();
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const cancel = useMutation({
    mutationFn: () => appointmentsApi.cancel(token),
    onSuccess: (item) => setMessage(`Đã hủy lịch ${item.code}.`),
    onError: (error: Error) => setMessage(error.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    change.mutate();
  }

  return (
    <main className={`${styles.page} ${styles.narrow}`}>
      <Breadcrumb
        items={[{ label: 'Đặt lịch', href: '/dat-lich' }, { label: 'Quản lý lịch hẹn' }]}
      />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Dịch vụ khách hàng</p>
        <h1>Quản lý lịch hẹn</h1>
        <p>Xem thông tin, chọn thời gian mới hoặc hủy lịch hẹn của bạn.</p>
      </header>
      {!token ? (
        <p>Liên kết quản lý lịch hẹn không hợp lệ.</p>
      ) : (
        <>
          {message && (
            <p className={styles.notice} role="status">
              {message}
            </p>
          )}
          {appointment.isLoading && <p>Đang tải lịch hẹn…</p>}
          {appointment.isError && (
            <p className={styles.notice} role="alert">
              Không tìm thấy lịch hẹn hoặc liên kết đã hết hiệu lực.
            </p>
          )}
          {appointment.data && (
            <p>
              <strong>{appointment.data.code}</strong> · {appointment.data.store?.name} ·{' '}
              {appointment.data.appointment_date.slice(0, 10)} lúc{' '}
              {appointment.data.appointment_time.slice(0, 5)}
            </p>
          )}
          <form onSubmit={submit} className={styles.form}>
            <label>
              Ngày mới
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  setDate(event.target.value);
                  setTime('');
                }}
              />
            </label>
            <label>
              Giờ mới
              <select required value={time} onChange={(event) => setTime(event.target.value)}>
                <option value="">Chọn khung giờ</option>
                {(slots.data ?? []).map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" isLoading={change.isPending}>
              Đổi lịch
            </Button>
          </form>
          <hr style={{ margin: '28px 0' }} />
          <Button
            variant="danger"
            type="button"
            isLoading={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            Hủy lịch hẹn
          </Button>
        </>
      )}
    </main>
  );
}

export default function ManageAppointmentPage() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <AppointmentManager />
    </Suspense>
  );
}
