'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { packagesApi } from '@/lib/api/packages';
import { storesApi } from '@/lib/api/stores';
import { hasKnowledgePlaceholder, safeChatHref } from '@/lib/chat-widget';
import type { ChatSource } from '@/lib/api/chatbot';
import styles from './ChatWidget.module.scss';

export function ChatRichCards({
  sources,
  text,
  onRegister,
}: {
  sources: ChatSource[];
  text: string;
  onRegister: (code: string) => void;
}) {
  const slugs = [
    ...new Set(
      sources
        .filter((source) => source.href.startsWith('/goi-cuoc/'))
        .map((source) => source.href.split('/').pop()!),
    ),
  ].slice(0, 3);
  const packages = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['chat-package', slug],
      queryFn: () => packagesApi.getPublicBySlug(slug),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const hasStores = sources.some((source) => source.href === '/cua-hang');
  const stores = useQuery({
    queryKey: ['chat-stores'],
    queryFn: () => storesApi.listPublic(),
    enabled: hasStores,
    staleTime: 60_000,
    retry: false,
  });
  const mentionedPackages = packages
    .map((query) => query.data)
    .filter(
      (item) =>
        item &&
        typeof item.code === 'string' &&
        typeof item.name === 'string' &&
        typeof item.slug === 'string' &&
        item.status !== 'inactive' &&
        item.status !== 'hidden' &&
        !hasKnowledgePlaceholder(`${item.name} ${item.code}`) &&
        Number.isFinite(Number(item.price)) &&
        Number.isFinite(Number(item.duration_value)) &&
        (text.toLowerCase().includes(item.code.toLowerCase()) ||
          text.toLowerCase().includes(item.name.toLowerCase())),
    );
  const activeStores = (Array.isArray(stores.data) ? stores.data : []).filter(
    (store) =>
      store &&
      store.status !== 'inactive' &&
      typeof store.name === 'string' &&
      typeof (store.full_address || store.address) === 'string' &&
      !hasKnowledgePlaceholder(`${store.name} ${store.full_address || store.address}`),
  );
  const mentionedStores = activeStores.filter((store) =>
    text.toLowerCase().includes(store.name.toLowerCase()),
  );
  const storeCards = (mentionedStores.length ? mentionedStores : activeStores).slice(
    0,
    Math.max(0, 3 - mentionedPackages.length),
  );
  if (!mentionedPackages.length && !storeCards.length) return null;
  return (
    <div className={styles.richCards} aria-label="Thông tin dịch vụ hiện hành">
      {mentionedPackages.map(
        (item) =>
          item && (
            <article key={`package-${item.id}`} className={styles.richCard}>
              <span className={styles.cardLabel}>Gói cước</span>
              <h3>{item.name}</h3>
              <span className={styles.smallText}>{item.code}</span>
              <p className={styles.cardPrice}>
                {new Intl.NumberFormat('vi-VN').format(Number(item.price))}đ{' '}
                <span>
                  / {item.duration_value} {item.duration_unit === 'thang' ? 'tháng' : 'ngày'}
                </span>
              </p>
              <ul>
                {(Array.isArray(item.benefits) && item.benefits.length
                  ? item.benefits
                  : [item.data_desc, item.call_desc, item.sms_desc].filter(Boolean)
                )
                  .filter(
                    (benefit) => typeof benefit === 'string' && !hasKnowledgePlaceholder(benefit),
                  )
                  .slice(0, 3)
                  .map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
              </ul>
              {typeof item.sms_syntax === 'string' &&
                item.sms_syntax.trim() &&
                !hasKnowledgePlaceholder(item.sms_syntax) && (
                  <p>
                    Cú pháp: <code>{item.sms_syntax}</code>
                  </p>
                )}
              <div className={styles.cardActions}>
                <button type="button" onClick={() => onRegister(item.code)}>
                  Đăng ký
                </button>
                <Link href={`/goi-cuoc/${item.slug}`} target="_blank" rel="noopener noreferrer">
                  Chi tiết
                </Link>
              </div>
            </article>
          ),
      )}
      {storeCards.map((store) => {
        const phoneHref = safeChatHref(
          `tel:${(typeof store.phone === 'string' ? store.phone : '').replace(/[^\d+]/g, '')}`,
        );
        const address = store.full_address || store.address;
        const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name}, ${address}`)}`;
        return (
          <article key={`store-${store.id}`} className={styles.richCard}>
            <span className={styles.cardLabel}>Điểm giao dịch tham khảo</span>
            <h3>{store.name}</h3>
            <p>{address}</p>
            <p className={styles.smallText}>
              {store.opening_hours && !hasKnowledgePlaceholder(store.opening_hours)
                ? store.opening_hours
                : 'Giờ mở cửa chưa được cập nhật'}
            </p>
            <div className={styles.cardActions}>
              <a href={maps} target="_blank" rel="noopener noreferrer">
                <MapPin size={14} />
                Chỉ đường
              </a>
              {phoneHref && (
                <a href={phoneHref}>
                  <Phone size={14} />
                  Gọi
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
