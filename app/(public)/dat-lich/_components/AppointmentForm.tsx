'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (state.status === 'error' && state.message && !state.fieldErrors)
      showToast(state.message, 'error');
  }, [state, showToast]);

  if (state.status === 'success') {
    return (
      <div className={styles.success}>
        <h2>Đã nhận lịch hẹn</h2>
        <p>{state.message}</p>
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
      />
      <div className={styles.grid}>
        <TextField
          name="appointment_date"
          type="date"
          label="Ngày đến"
          required
          error={state.fieldErrors?.appointment_date}
        />
        <TextField
          name="appointment_time"
          type="time"
          label="Giờ đến"
          required
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
