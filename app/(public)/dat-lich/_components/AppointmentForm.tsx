'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/lib/api/appointments';
import { env } from '@/lib/env';
import { useFormState, useFormStatus } from 'react-dom';
import { Store } from '@/types/product';
import { submitAppointmentAction, AppointmentActionState } from '@/actions/appointment';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField, TextareaField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import styles from './AppointmentForm.module.scss';

const INITIAL_STATE: AppointmentActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" isLoading={pending}>
      Xác nhận đặt lịch
    </Button>
  );
}

export function AppointmentForm({ stores }: { stores: Store[] }) {
  const [state, formAction] = useFormState(submitAppointmentAction, INITIAL_STATE);
  const { showToast } = useToast();
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState('');
  const slots = useQuery({
    queryKey: ['appointment-slots', storeId, date],
    queryFn: () => appointmentsApi.slots(Number(storeId), date),
    enabled: Boolean(storeId && date),
  });

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors)
      showToast(state.message, 'error');
  }, [state, showToast]);

  if (state.status === 'success') {
    return (
      <div className={styles.success}>
        <h2>Đã nhận lịch hẹn</h2>
        <p>{state.message}</p>
        {state.appointment?.manage_token && (
          <p>
            <a
              href={`${env.NEXT_PUBLIC_API_URL}/public/appointments/calendar.ics?token=${state.appointment.manage_token}`}
            >
              Thêm vào lịch (.ics)
            </a>
            {' · '}
            <a href={`/dat-lich/quan-ly?token=${state.appointment.manage_token}`}>
              Hủy hoặc đổi lịch
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <SelectField
        name="store_id"
        label="Cửa hàng muốn đến"
        required
        options={[
          { value: '', label: 'Chọn cửa hàng' },
          ...stores.map((store) => ({
            value: String(store.id),
            label: `${store.name} - ${store.district}`,
          })),
        ]}
        error={state.fieldErrors?.store_id}
        value={storeId}
        onChange={(event) => setStoreId(event.target.value)}
      />
      <div className={styles.grid}>
        <TextField
          name="appointment_date"
          type="date"
          label="Ngày đến"
          required
          error={state.fieldErrors?.appointment_date}
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setDate(event.target.value)}
        />
        <SelectField
          name="appointment_time"
          label="Giờ đến"
          required
          options={[
            { value: '', label: slots.isLoading ? 'Đang tải khung giờ…' : 'Chọn khung giờ' },
            ...(slots.data || []).map((value) => ({ value, label: value })),
          ]}
          error={state.fieldErrors?.appointment_time}
        />
      </div>
      <TextField
        name="customer_name"
        label="Họ tên"
        required
        error={state.fieldErrors?.customer_name}
      />
      <TextField name="phone" label="Số điện thoại" required error={state.fieldErrors?.phone} />
      <TextField
        name="email"
        type="email"
        label="Email nhận xác nhận (không bắt buộc)"
        error={state.fieldErrors?.email}
      />
      <TextareaField
        name="note"
        label="Nội dung cần hỗ trợ"
        rows={4}
        error={state.fieldErrors?.note}
      />
      <SubmitButton />
    </form>
  );
}
