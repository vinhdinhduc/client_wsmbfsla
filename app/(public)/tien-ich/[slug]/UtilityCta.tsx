'use client';
import styles from '@/styles/service-pages.module.scss';
import { useEffect, useState } from 'react';
import { env } from '@/lib/env';
import type { Utility } from '@/lib/api/utilities';
export default function UtilityCta({ item }: { item: Utility }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/iPad|iPhone|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop');
  }, []);
  const link =
    platform === 'ios'
      ? item.ios_url
      : platform === 'android'
        ? item.android_url
        : item.website_url;
  return (
    <section>
      <h2>Tải hoặc mở tiện ích</h2>
      {platform === 'desktop' ? (
        <div className={styles.qrGrid}>
          {(['ios', 'android', 'website'] as const).map(
            (p) =>
              item[`${p}_url` as keyof Utility] && (
                <div key={p}>
                  <img
                    width={160}
                    height={160}
                    alt={`QR ${p}`}
                    src={`${env.NEXT_PUBLIC_API_URL}/public/utilities/${item.id}/qr/${p}`}
                  />
                  <p>{p.toUpperCase()}</p>
                </div>
              ),
          )}
        </div>
      ) : link ? (
        <a href={link} rel="noopener noreferrer">
          {platform === 'ios' ? 'Tải trên App Store' : 'Tải trên Google Play'}
        </a>
      ) : (
        <p>Chưa có phiên bản cho thiết bị này.</p>
      )}
    </section>
  );
}
