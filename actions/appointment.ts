'use server';

import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api/client';
import { StoreAppointment } from '@/types/appointment';

const appointmentSchema = z.object({
  customer_name: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(20)
    .regex(/^[0-9+]+$/, 'Số điện thoại không hợp lệ'),
  store_id: z.coerce.number().int().positive('Vui lòng chọn cửa hàng'),
  appointment_date: z.string().min(1, 'Vui lòng chọn ngày đến'),
  appointment_time: z.string().min(1, 'Vui lòng chọn giờ đến'),
  note: z.string().max(2000).optional().or(z.literal('')),
});

export interface AppointmentActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof appointmentSchema>, string>>;
}

export async function submitAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const parsed = appointmentSchema.safeParse({
    customer_name: String(formData.get('customer_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    store_id: formData.get('store_id'),
    appointment_date: String(formData.get('appointment_date') ?? ''),
    appointment_time: String(formData.get('appointment_time') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.success) {
    const fieldErrors: AppointmentActionState['fieldErrors'] = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key) fieldErrors[key] = issue.message;
    });
    return { status: 'error', fieldErrors, message: 'Vui lòng kiểm tra lại thông tin' };
  }

  try {
    await apiFetch<StoreAppointment>('/public/appointments', {
      method: 'POST',
      body: { ...parsed.data, note: parsed.data.note || null },
    });
    return {
      status: 'success',
      message: 'Đặt lịch thành công. Nhân viên sẽ đón tiếp bạn tại cửa hàng.',
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof ApiError ? err.message : 'Không thể đặt lịch, vui lòng thử lại',
    };
  }
}
