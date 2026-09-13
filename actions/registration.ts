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
  email: z.string().email('Email không hợp lệ').max(150),
  note: z.string().optional().nullable(),
  delivery_method: z.enum(['address', 'store']),
  sim_type: z.enum(['physical', 'esim']),
  delivery_store: z.string().max(255).optional().nullable(),
  province: z.literal('Sơn La', { errorMap: () => ({ message: 'Chỉ hỗ trợ tỉnh Sơn La' }) }),
  ward: z.string().min(1, 'Vui lòng chọn xã/phường Sơn La'),
  delivery_address: z.string().max(255).optional().nullable(),
  items: z.array(cartItemSchema).min(1, 'Giỏ hàng không được để trống'),
  recaptcha_token: z.string().min(1, 'Thiếu recaptcha token, vui lòng thử lại'),
}).superRefine((value, context) => {
  if (value.delivery_method === 'address') {
    if (!value.ward) context.addIssue({ code: 'custom', path: ['ward'], message: 'Vui lòng chọn xã/phường Sơn La' });
    if (!value.delivery_address) context.addIssue({ code: 'custom', path: ['delivery_address'], message: 'Vui lòng nhập địa chỉ nhận hàng' });
  }
  if (value.delivery_method === 'store' && !value.delivery_store) {
    context.addIssue({ code: 'custom', path: ['delivery_store'], message: 'Vui lòng chọn cửa hàng nhận SIM' });
  }
});

export interface RegistrationActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<'customer_name' | 'phone' | 'email' | 'note' | 'items' | 'province' | 'ward' | 'delivery_address' | 'delivery_store', string>>;
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
    email: String(formData.get('email') ?? ''),
    note: formData.get('note') ? String(formData.get('note')) : null,
    delivery_method: String(formData.get('delivery_method') ?? ''),
    sim_type: String(formData.get('sim_type') ?? ''),
    delivery_store: formData.get('delivery_store') ? String(formData.get('delivery_store')) : null,
    province: String(formData.get('province') ?? ''),
    ward: String(formData.get('ward') ?? ''),
    delivery_address: String(formData.get('delivery_address') ?? ''),
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
