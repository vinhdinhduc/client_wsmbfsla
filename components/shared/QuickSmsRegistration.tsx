'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import styles from './QuickSmsRegistration.module.scss';
export function QuickSmsRegistration({ syntax }: { syntax: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(syntax);
      setMessage('Đã sao chép cú pháp');
    } catch {
      setMessage('Bạn có thể chọn và sao chép cú pháp bên trên.');
    }
  }
  return (
    <section className={styles.box}>
      <h2>Cách đăng ký nhanh</h2>
      <p>Soạn tin nhắn theo cú pháp:</p>
      <code>{syntax}</code>
      <button type="button" onClick={copy}>
        <Copy aria-hidden="true" /> Copy cú pháp
      </button>
      <span role="status">{message}</span>
    </section>
  );
}
