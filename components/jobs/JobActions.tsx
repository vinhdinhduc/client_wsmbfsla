'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, Share2, Copy, Check } from 'lucide-react';
import styles from './JobDetail.module.scss';

export function ApplyLink({ className = '' }: { className?: string }) {
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const received = () => setSubmitted(true);
    window.addEventListener('job-application-submitted', received);
    return () => window.removeEventListener('job-application-submitted', received);
  }, []);
  if (submitted) return null;
  return (
    <a
      className={`${styles.primaryButton} ${className}`}
      href="#application"
      onClick={(event) => {
        const form = document.getElementById('application');
        if (!form) return;
        event.preventDefault();
        form.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        });
        form.focus({ preventScroll: true });
      }}
    >
      Ứng tuyển ngay
      <ArrowDown size={18} aria-hidden="true" />
    </a>
  );
}

export function JobActions({ open, title }: { open: boolean; title: string }) {
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [href, setHref] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const received = () => setSubmitted(true);
    window.addEventListener('job-application-submitted', received);
    return () => window.removeEventListener('job-application-submitted', received);
  }, []);
  useEffect(() => {
    setHref(window.location.href.split('#')[0]);
    const form = document.getElementById('application');
    if (!form || !open) return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), {
      rootMargin: '0px 0px -16px 0px',
      threshold: 0,
    });
    observer.observe(form);
    return () => observer.disconnect();
  }, [open]);
  return (
    <>
      <div className={styles.actions}>
        {open && <ApplyLink />}
        <button
          type="button"
          className={styles.secondaryButton}
          aria-expanded={share}
          aria-controls="job-share"
          onClick={() => setShare(!share)}
        >
          <Share2 size={18} aria-hidden="true" />
          Chia sẻ
        </button>
      </div>
      {share && (
        <div id="job-share" className={styles.share}>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(href);
                setCopied(true);
                setCopyError('');
              } catch {
                setCopyError('Bạn có thể sao chép địa chỉ trang từ thanh trình duyệt.');
              }
            }}
          >
            {copied ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Copy size={17} aria-hidden="true" />
            )}
            {copied ? 'Đã sao chép' : 'Sao chép link'}
          </button>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(href)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Facebook
          </a>
          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title, url: href });
                else {
                  await navigator.clipboard.writeText(href);
                  setCopyError('Đã sao chép link. Mở Zalo và dán vào cuộc trò chuyện để chia sẻ.');
                }
              } catch (error) {
                if ((error as Error).name !== 'AbortError')
                  setCopyError('Hãy sao chép link và dán vào Zalo để chia sẻ.');
              }
            }}
          >
            Zalo
          </button>
          <span role="status" aria-live="polite">
            {copyError || (copied ? 'Đã sao chép liên kết tuyển dụng.' : '')}
          </span>
        </div>
      )}
      {open && !submitted && !formVisible && (
        <div className={styles.mobileApply}>
          <ApplyLink />
        </div>
      )}
    </>
  );
}
