import { News } from '@/types/product';
import { formatDate } from '@/lib/format';

export function ArticleBody({ news }: { news: News }) {
  return (
    <article>
      <p className="text-sm text-neutral-500">{formatDate(news.published_at ?? news.created_at)}</p>
      <div
        className="prose prose-sm mt-4 max-w-none text-neutral-900 sm:prose-base"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </article>
  );
}
