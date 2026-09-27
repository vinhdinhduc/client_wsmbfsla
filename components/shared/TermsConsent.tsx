'use client';
import { useId } from 'react';
import styles from './TermsConsent.module.scss';
export function TermsConsent({
  checked,
  onChange,
  error,
  value = 'on',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  value?: string;
}) {
  const id = useId();
  return (
    <div className={styles.consent}>
      <label htmlFor={id}>
        <input
          id={id}
          name="agreed_terms"
          value={value}
          type="checkbox"
          required
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>
          Tôi đã đọc và đồng ý với{' '}
          <a href="/dieu-khoan-su-dung" target="_blank" rel="noopener noreferrer">
            Điều khoản sử dụng
          </a>{' '}
          và{' '}
          <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener noreferrer">
            Chính sách bảo mật
          </a>
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
