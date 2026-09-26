'use client';
import { useEffect, useState } from 'react';
import { Check, Link as LinkIcon, MessageCircle } from 'lucide-react';
import styles from './ShareButtons.module.scss';

export function ShareButtons() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    setUrl(window.location.href);
  }, []);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Đã sao chép liên kết');
    } catch {
      setStatus('Không thể sao chép tự động. Bạn có thể sao chép liên kết bên dưới.');
    }
  }
  return (
    <nav className={styles.share} aria-label="Chia sẻ bài viết">
      <strong>Chia sẻ:</strong>
      <a
        className={styles.facebook}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ trên Facebook"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8z" /></svg>
        Facebook
      </a>
      <a
        className={styles.zalo}
        href={`https://zalo.me/share?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ trên Zalo"
      >
        <MessageCircle size={18} aria-hidden="true" />
        Zalo
      </a>
      <button type="button" onClick={copyLink}>
        {status === 'Đã sao chép liên kết' ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <LinkIcon size={18} aria-hidden="true" />
        )}
        Sao chép liên kết
      </button>
      <span className={styles.status} role="status">
        {status}
      </span>
      {status.startsWith('Không') && (
        <input
          className={styles.fallback}
          aria-label="Liên kết bài viết"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </nav>
  );
}
