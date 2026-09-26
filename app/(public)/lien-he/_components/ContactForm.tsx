'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storesApi } from '@/lib/api/stores';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { TextField, TextareaField, SelectField, CheckboxField } from '@/components/ui/FormField';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { submitContactAction, ContactActionState } from '@/actions/contact';
import styles from './ContactForm.module.scss';

const INITIAL_STATE: ContactActionState = { status: 'idle' };

function SubmitButton({ consent }: { consent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className={styles.submitButton}
      isLoading={pending}
      disabled={!consent}
    >
      Gửi liên hệ
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useFormState(submitContactAction, INITIAL_STATE);
  const { getToken } = useRecaptcha();
  const { showToast } = useToast();
  const [length, setLength] = useState(0);
  const [consent, setConsent] = useState(false);
  const stores = useQuery({ queryKey: ['contact-stores'], queryFn: () => storesApi.listPublic() });

  useEffect(() => {
    if (state.status === 'success') showToast(state.message ?? 'Gửi thành công', 'success');
    else if (state.status === 'error' && state.message && !state.fieldErrors)
      showToast(state.message, 'error');
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
      <div className={styles.successState}>
        <p className={styles.successMessage}>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={handleAction} className={styles.form}>
      <TextField
        name="name"
        label="Họ tên"
        placeholder="Nguyễn Văn A"
        required
        error={state.fieldErrors?.name}
      />
      <SelectField
        label="Chủ đề"
        name="topic"
        required
        defaultValue=""
        error={state.fieldErrors?.topic}
      >
        <option value="" disabled>
          Chọn chủ đề
        </option>
        <option value="package">Tư vấn gói cước</option>
        <option value="sim">Sim số</option>
        <option value="solution">Giải pháp số</option>
        <option value="support">Hỗ trợ – Khiếu nại</option>
        <option value="other">Khác</option>
      </SelectField>
      <SelectField
        label="Cửa hàng gần bạn (tùy chọn)"
        name="store_id"
        defaultValue=""
        hint={
          stores.isPending
            ? 'Đang tải danh sách cửa hàng…'
            : stores.isError
              ? 'Chưa tải được danh sách cửa hàng. Bạn vẫn có thể gửi liên hệ.'
              : undefined
        }
      >
        <option value="">Không chọn</option>
        {stores.data?.map((store) => (
          <option value={store.id} key={store.id}>
            {store.name}
          </option>
        ))}
      </SelectField>
      <TextField
        name="phone"
        inputMode="tel"
        type="tel"
        label="Số điện thoại"
        placeholder="09xxxxxxxx"
        required
        error={state.fieldErrors?.phone}
      />
      <TextField
        name="email"
        type="email"
        label="Email"
        placeholder="email@example.com"
        required
        error={state.fieldErrors?.email}
      />
      <TextareaField
        name="message"
        label="Nội dung"
        placeholder="Nội dung liên hệ..."
        required
        rows={5}
        maxLength={1000}
        onChange={(event) => setLength(event.target.value.length)}
        error={state.fieldErrors?.message}
      />
      <small className={styles.counter}>{length}/1.000 ký tự</small>
      <CheckboxField
        label="Tôi đồng ý cho MobiFone Sơn La xử lý dữ liệu để phản hồi yêu cầu."
        name="consent"
        required
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
      />
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="recaptcha_token" />
      <p className={styles.notice}>
        Trang này được bảo vệ bởi reCAPTCHA và tuân theo Chính sách bảo mật và Điều khoản dịch vụ
        của Google.
      </p>
      <SubmitButton consent={consent} />
    </form>
  );
}
