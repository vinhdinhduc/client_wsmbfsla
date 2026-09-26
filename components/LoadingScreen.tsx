'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './LoadingScreen.module.scss';

export interface LoadingScreenProps {
  text?: string;
  fullScreen?: boolean;
  /** Keep the component mounted and set false to play the exit transition. */
  visible?: boolean;
}

export default function LoadingScreen({
  text = 'Đang tải',
  fullScreen = true,
  visible = true,
}: LoadingScreenProps) {
  const [present, setPresent] = useState(visible);

  useEffect(() => {
    if (visible) {
      setPresent(true);
      return;
    }
    // Only removal uses a timer; all visual animations run in CSS.
    const timer = window.setTimeout(() => setPresent(false), 300);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible && !present) return null;

  return (
    <div
      className={`${styles.screen} ${fullScreen ? styles.fullScreen : styles.inline} ${!visible ? styles.leaving : ''}`}
      role="status"
      aria-live="polite"
      aria-label={text}
      aria-hidden={!visible}
      aria-busy={visible}
    >
      <div className={styles.content}>
        <Image
          className={styles.logo}
          src="/logo.png"
          alt="MobiFone"
          width={698}
          height={129}
          priority
          unoptimized
        />
        <div className={styles.caption} aria-hidden="true">
          <span>{text}</span>
          <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    </div>
  );
}
