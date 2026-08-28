'use server';

import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api/client';
import { ContactMessage } from '@/types/order';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên').max(100),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .max(20)
    .regex(/^[0-9+]+$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').max(100),
  message: z.string().min(1, 'Vui lòng nhập nội dung'),
  recaptcha_token: z.string().min(1, 'Thiếu recaptcha token, vui lòng thử lại'),
});

export interface ContactActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof contactFormSchema>, string>>;
}

/**
 * Server Action nhan FormData tu <ContactForm> - validate bang zod (khop chinh
 * xac createContactSchema o backend) truoc khi goi POST /api/public/contacts,
 * tranh gui request khong hop le len server.
 */
export async function submitContactAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    message: String(formData.get('message') ?? ''),
    recaptcha_token: String(formData.get('recaptcha_token') ?? ''),
  };

  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: ContactActionState['fieldErrors'] = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key) fieldErrors[key] = issue.message;
    });
    return { status: 'error', fieldErrors, message: 'Vui lòng kiểm tra lại thông tin đã nhập' };
  }

  try {
    await apiFetch<ContactMessage>('/public/contacts', { method: 'POST', body: parsed.data });
    return { status: 'success', message: 'Gửi liên hệ thành công, chúng tôi sẽ phản hồi sớm nhất' };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại';
    return { status: 'error', message };
  }
}
