'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField } from '@/components/ui/FormField';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { submitContactAction, ContactActionState } from '@/actions/contact';

const INITIAL_STATE: ContactActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" isLoading={pending}>
      Gửi liên hệ
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useFormState(submitContactAction, INITIAL_STATE);
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();

  useEffect(() => {
    if (state.status === 'success') showToast(state.message ?? 'Gửi thành công', 'success');
    else if (state.status === 'error' && state.message && !state.fieldErrors) showToast(state.message, 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleAction(formData: FormData) {
    try {
      const token = await getToken('submit_contact');
      formData.set('recaptcha_token', token);
      formAction(formData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xác thực reCAPTCHA', 'error');
    }
  }

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
        <p className="font-heading text-lg font-semibold text-success">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={handleAction} className="space-y-4">
      <TextField name="name" label="Họ tên" placeholder="Nguyễn Văn A" required error={state.fieldErrors?.name} />
      <TextField name="phone" label="Số điện thoại" placeholder="09xxxxxxxx" required error={state.fieldErrors?.phone} />
      <TextField name="email" type="email" label="Email" placeholder="email@example.com" required error={state.fieldErrors?.email} />
      <TextareaField name="message" label="Nội dung" placeholder="Nội dung liên hệ..." required rows={5} error={state.fieldErrors?.message} />
      <input type="hidden" name="recaptcha_token" />
      <p className="text-xs text-neutral-500">
        Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều khoản dịch vụ của Google.
      </p>
      <SubmitButton />
    </form>
  );
}
