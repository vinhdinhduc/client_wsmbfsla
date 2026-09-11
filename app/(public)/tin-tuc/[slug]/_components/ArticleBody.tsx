import { News } from '@/types/product';
import { formatDate } from '@/lib/format';
import styles from './ArticleBody.module.scss';

export function ArticleBody({ news }: { news: News }) {
  return (
    <article>
      <p className={styles.date}>{formatDate(news.published_at ?? news.created_at)}</p>
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: news.content }} />
    </article>
  );
}
