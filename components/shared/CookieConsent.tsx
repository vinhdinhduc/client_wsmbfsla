'use client';
import styles from './CookieConsent.module.scss';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
const KEY = 'mfsl_cookie_consent_v1';
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!localStorage.getItem(KEY)), []);
  if (!visible) return null;
  const save = (value: 'necessary' | 'analytics') => {
    localStorage.setItem(KEY, JSON.stringify({ value, at: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: value }));
    setVisible(false);
  };
  return (
    <aside role="dialog" aria-label="Lựa chọn cookie" className={styles.dialog}>
      <strong>Quyền riêng tư và cookie</strong>
      <p>
        Website dùng cookie cần thiết để hoạt động. Cookie đo lường chỉ được bật khi bạn đồng ý.{' '}
        <Link href="/chinh-sach-bao-mat">Xem chính sách</Link>.
      </p>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => save('necessary')}>
          Chỉ cookie cần thiết
        </Button>
        <Button onClick={() => save('analytics')}>Đồng ý đo lường</Button>
      </div>
    </aside>
  );
}
