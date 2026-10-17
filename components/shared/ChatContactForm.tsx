'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { apiFetch } from '@/lib/api/client';
import type { ContactMessage } from '@/types/order';
import styles from './ChatWidget.module.scss';

export default function ChatContactForm({
  onBack,
  initialNeed = '',
}: {
  onBack: () => void;
  initialNeed?: string;
}) {
  const { getToken } = useRecaptcha();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [consent, setConsent] = useState(false);
  const sendingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current || !consent) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const phone = String(form.get('phone') || '').replace(/[ .-]/g, '');
    const message = String(form.get('message') || '').trim();
    if (!name || !message) {
      setError('Vui lòng nhập họ tên và nhu cầu tư vấn.');
      return;
    }
    if (!/^(0|\+84)\d{9}$/.test(phone)) {
      setError('Số điện thoại không hợp lệ. Nhập 10 chữ số hoặc định dạng +84.');
      return;
    }
    sendingRef.current = true;
    setPending(true);
    setError('');
    try {
      const token = await getToken('submit_contact');
      const result = await apiFetch<ContactMessage>('/public/contacts', {
        method: 'POST',
        body: {
          name,
          phone,
          message,
          email: '',
          topic: 'support',
          source: 'chatbot',
          agreed_terms: true,
          website: String(form.get('website') || ''),
          recaptcha_token: token,
        },
      });
      setSuccess(
        `Đã gửi yêu cầu tư vấn${result.code ? `. Mã liên hệ: ${result.code}` : ''}. Nhân viên sẽ phản hồi trong giờ làm việc.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Chưa gửi được yêu cầu. Vui lòng thử lại.',
      );
    } finally {
      sendingRef.current = false;
      setPending(false);
    }
  }

  if (success)
    return (
      <div className={styles.contactForm}>
        <p role="status">{success}</p>
        <button type="button" className={styles.secondaryButton} onClick={onBack}>
          Quay lại hội thoại
        </button>
      </div>
    );
  return (
    <form className={styles.contactForm} onSubmit={submit}>
      <h3>Để nhân viên liên hệ với bạn</h3>
      <p id="chat-contact-privacy">
        Thông tin này được dùng để liên hệ tư vấn. Xem{' '}
        <Link href="/chinh-sach-bao-mat" target="_blank" rel="noopener noreferrer">
          Chính sách bảo mật
        </Link>{' '}
        trước khi nhập số điện thoại.
      </p>
      <label>
        Họ tên
        <input
          ref={nameRef}
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          disabled={pending}
        />
      </label>
      <label>
        Số điện thoại
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-describedby="chat-contact-privacy"
          required
          maxLength={20}
          disabled={pending}
        />
      </label>
      <label>
        Nhu cầu tư vấn
        <textarea
          name="message"
          defaultValue={initialNeed}
          rows={3}
          required
          maxLength={1000}
          disabled={pending}
        />
      </label>
      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={pending}
          required
        />
        <span>
          Tôi đồng ý{' '}
          <Link href="/dieu-khoan-su-dung" target="_blank" rel="noopener noreferrer">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link href="/chinh-sach-bao-mat" target="_blank" rel="noopener noreferrer">
            Chính sách bảo mật
          </Link>
          , cho phép liên hệ tư vấn.
        </span>
      </label>
      <p className={styles.smallText}>
        Biểu mẫu được bảo vệ bởi reCAPTCHA. Áp dụng{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Chính sách bảo mật
        </a>{' '}
        và{' '}
        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
          Điều khoản
        </a>{' '}
        của Google.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.primaryButton} disabled={pending || !consent}>
        {pending ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn'}
      </button>
      <button type="button" className={styles.secondaryButton} onClick={onBack} disabled={pending}>
        Quay lại hội thoại
      </button>
    </form>
  );
}
