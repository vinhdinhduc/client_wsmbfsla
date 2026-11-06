'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './RegistrationSyntax.module.scss';

interface RegistrationSyntaxProps {
  syntax?: string | null;
  shortcode?: string | null;
  showNote?: boolean;
  disabled?: boolean;
  reserveSpace?: boolean;
  spacing?: 'standard' | 'insideGappedCard';
  className?: string;
}

export function RegistrationSyntax({
  syntax,
  shortcode,
  showNote = false,
  disabled = false,
  reserveSpace = false,
  spacing = 'standard',
  className = '',
}: RegistrationSyntaxProps) {
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const message = syntax?.trim() ?? '';
  const destination = shortcode?.trim() ?? '';

  if (!message || !destination) {
    return reserveSpace ? (
      <div
        aria-hidden="true"
        className={`${styles.placeholder} ${spacing === 'insideGappedCard' ? styles.insideGappedCard : ''} ${className}`}
      />
    ) : null;
  }

  const smsHref = `sms:${encodeURIComponent(destination)}?body=${encodeURIComponent(message)}`;
  const formattedText = (
    <>
      <span>{message}</span>
      <span className={styles.destinationText}> gửi {destination}</span>
    </>
  );

  async function copySyntax() {
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(message);
        } catch {
          fallbackCopy(message);
        }
      } else {
        fallbackCopy(message);
      }
      setCopied(true);
      setAnnouncement('Đã sao chép');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setCopied(false);
        setAnnouncement('');
      }, 2000);
    } catch {
      setCopied(false);
      setAnnouncement('Không thể sao chép. Vui lòng chọn và sao chép cú pháp.');
    }
  }

  return (
    <div
      className={`${styles.wrapper} ${spacing === 'insideGappedCard' ? styles.insideGappedCard : ''} ${showNote ? styles.noteWrapper : ''} ${className}`}
    >
      <span className={styles.label}>Cú pháp đăng ký</span>
      <div className={styles.syntaxRow}>
        {disabled ? (
          <span className={`${styles.syntaxText} ${styles.mobileSms}`}>{formattedText}</span>
        ) : (
          <a
            aria-label={`Cú pháp đăng ký ${message} gửi ${destination}`}
            className={`${styles.syntaxText} ${styles.mobileSms}`}
            href={smsHref}
          >
            {formattedText}
          </a>
        )}
        <code className={`${styles.syntaxText} ${styles.desktopSyntax}`}>{formattedText}</code>
        <button
          aria-label={`Sao chép cú pháp ${message}`}
          className={styles.copyButton}
          onClick={copySyntax}
          disabled={disabled}
          title={copied ? 'Đã sao chép' : `Sao chép nội dung tin nhắn: ${message}`}
          type="button"
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied && <span className={styles.tooltip}>Đã sao chép</span>}
        </button>
      </div>
      <span aria-live="polite" className={styles.srOnly}>
        {announcement}
      </span>
      {showNote && (
        <p className={styles.note}>Soạn tin gửi tổng đài, cước tin nhắn theo quy định.</p>
      )}
    </div>
  );
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  if (!copied) throw new Error('Clipboard copy command was rejected');
}
