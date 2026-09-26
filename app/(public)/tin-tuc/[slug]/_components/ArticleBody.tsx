'use client';
import { useEffect } from 'react';
import { News } from '@/types/product';
import { newsApi } from '@/lib/api/news';
import { formatDate } from '@/lib/format';
import { ContentImage } from '@/components/shared/ContentImage';
import styles from './ArticleBody.module.scss';

export function ArticleBody({ news }: { news: News }) {
  useEffect(() => {
    let visitor = localStorage.getItem('mfsl_news_visitor');
    if (!visitor) {
      visitor = crypto.randomUUID();
      localStorage.setItem('mfsl_news_visitor', visitor);
    }
    void newsApi.countView(news.slug, visitor).catch(() => undefined);
  }, [news.slug]);
  return (
    <article>
      <p className={styles.date}>
        {formatDate(news.published_at ?? news.created_at)} · {news.author_name || 'MobiFone Sơn La'}{' '}
        · {news.view_count || 0} lượt xem
      </p>
      {(news.cover_url || news.thumbnail) && (
        <ContentImage
          src={news.cover_url || news.thumbnail}
          alt={news.cover_alt || news.title}
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 16 }}
        />
      )}
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: news.content }} />
    </article>
  );
}
