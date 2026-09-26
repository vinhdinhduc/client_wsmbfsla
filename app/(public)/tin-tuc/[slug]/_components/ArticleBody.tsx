'use client';
import { useEffect } from 'react';
import { CalendarDays, UserRound, Eye, Clock3 } from 'lucide-react';
import { News } from '@/types/product';
import { newsApi } from '@/lib/api/news';
import { formatDate } from '@/lib/format';
import { ContentImage } from '@/components/shared/ContentImage';
import styles from './ArticleBody.module.scss';

export function ArticleBody({ news }: { news: News }) {
  useEffect(() => {
    let visitor: string;
    try {
      visitor = localStorage.getItem('mfsl_news_visitor') || '';
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem('mfsl_news_visitor', visitor);
      }
    } catch {
      return;
    }
    void newsApi.countView(news.slug, visitor).catch(() => undefined);
  }, [news.slug]);
  const words = news.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return (
    <article>
      <div className={styles.date}>
        <span>
          <CalendarDays size={16} aria-hidden="true" />
          <time dateTime={news.published_at ?? news.created_at}>
            {formatDate(news.published_at ?? news.created_at)}
          </time>
        </span>
        <span>
          <UserRound size={16} aria-hidden="true" />
          {news.author_name || 'MobiFone Sơn La'}
        </span>
        <span>
          <Eye size={16} aria-hidden="true" />
          {(news.view_count || 0).toLocaleString('vi-VN')} lượt xem
        </span>
        <span title="Ước tính thời gian đọc">
          <Clock3 size={16} aria-hidden="true" />
          {minutes} phút đọc
        </span>
      </div>
      {(news.cover_url || news.thumbnail) && (
        <ContentImage
          src={news.cover_url || news.thumbnail}
          alt={news.cover_alt || news.title}
          className={styles.cover}
        />
      )}
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: news.content }} />
    </article>
  );
}
