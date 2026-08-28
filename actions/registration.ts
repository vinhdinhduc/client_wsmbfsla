'use server';

import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api/client';
import { RegistrationGroup } from '@/types/order';

const cartItemSchema = z.object({
  type: z.enum(['sim', 'goi_cuoc', 'giai_phap']),
  reference_id: z.coerce.number().int().positive(),
});

const submitCartSchema = z.object({
  customer_name: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(20)
    .regex(/^[0-9+]+$/, 'Số điện thoại không hợp lệ'),
  note: z.string().optional().nullable(),
  items: z.array(cartItemSchema).min(1, 'Giỏ hàng không được để trống'),
  recaptcha_token: z.string().min(1, 'Thiếu recaptcha token, vui lòng thử lại'),
});

export interface RegistrationActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<'customer_name' | 'phone' | 'note' | 'items', string>>;
  registrationId?: number;
}

/**
 * Server Action nhan FormData tu trang /gio-hang - `items` duoc client
 * serialize thanh chuoi JSON (danh sach san pham trong CartContext) truoc khi
 * submit (xem lib/cart.ts: serializeCartItemsForSubmit).
 */
export async function submitRegistrationAction(
  _prevState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  let itemsRaw: unknown;
  try {
    itemsRaw = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    return { status: 'error', message: 'Dữ liệu giỏ hàng không hợp lệ, vui lòng thử lại' };
  }

  const raw = {
    customer_name: String(formData.get('customer_name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    note: formData.get('note') ? String(formData.get('note')) : null,
    items: itemsRaw,
    recaptcha_token: String(formData.get('recaptcha_token') ?? ''),
  };

  const parsed = submitCartSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: RegistrationActionState['fieldErrors'] = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key) fieldErrors[key] = issue.message;
    });
    return { status: 'error', fieldErrors, message: 'Vui lòng kiểm tra lại thông tin đã nhập' };
  }

  try {
    const result = await apiFetch<RegistrationGroup>('/public/registrations', {
      method: 'POST',
      body: parsed.data,
    });
    return {
      status: 'success',
      message: 'Đăng ký thành công, nhân viên sẽ liên hệ trong thời gian sớm nhất',
      registrationId: result.id,
    };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại';
    return { status: 'error', message };
  }
}
