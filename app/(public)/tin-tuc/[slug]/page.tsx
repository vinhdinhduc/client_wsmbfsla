import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { ArticleBody } from './_components/ArticleBody';
import styles from './page.module.scss';
import Link from 'next/link';
import { ContentImage } from '@/components/shared/ContentImage';
import { formatDate } from '@/lib/format';
import { News } from '@/types/product';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { ShareButtons } from './_components/ShareButtons';

export const revalidate = 60;

function NewsTeaser({ item }: { item: News }) {
  return (
    <Link href={`/tin-tuc/${item.slug}`} className={styles.card}>
      <ContentImage src={item.thumbnail || item.cover_url} alt="" className={styles.thumbnail} />
      <span className={styles.cardText}>
        <strong>{item.title}</strong>
        <span className={styles.cardDate}>
          <CalendarDays size={14} aria-hidden="true" />
          {formatDate(item.published_at || item.created_at)}
        </span>
      </span>
    </Link>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  khuyen_mai: 'Khuyến mãi',
  su_kien: 'Sự kiện',
  thong_bao: 'Thông báo',
};

export async function generateStaticParams() {
  try {
    const result = await newsApi.listPublic({ page_size: 200 });
    return result.items.map((n) => ({ slug: n.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const news = await newsApi.getPublicBySlug(slug);
    if ('redirect' in news)
      return buildMetadata({ title: 'Tin tức', path: `/tin-tuc/${news.redirect}` });
    return buildMetadata({
      title: news.title,
      description: news.summary,
      image: news.thumbnail,
      path: `/tin-tuc/${news.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Tin tức', path: `/tin-tuc/${slug}` });
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let news;
  try {
    news = await newsApi.getPublicBySlug(slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }
  if ('redirect' in news) permanentRedirect(`/tin-tuc/${news.redirect}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: news.title,
    description: news.summary,
    image: news.cover_url || news.thumbnail,
    datePublished: news.published_at,
    dateModified: news.updated_at,
    author: { '@type': 'Organization', name: news.author_name || 'MobiFone Sơn La' },
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Breadcrumb items={[{ label: 'Tin tức', href: '/tin-tuc' }, { label: news.title }]} />
      <div className={styles.layout}>
        <div className={styles.content}>
          <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
          <h1 className={styles.title}>{news.title}</h1>
          <div className={styles.body}>
            <ArticleBody news={news} />
          </div>
          <ShareButtons />
          {news.related && news.related.length > 0 && (
            <section className={styles.related}>
              <h2>Tin liên quan</h2>
              <div className={styles.relatedGrid}>
                {news.related.map((item) => (
                  <NewsTeaser key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className={styles.sidebar} aria-label="Thông tin tin tức bổ sung">
          <section className={styles.sideSection}>
            <h2>Danh mục tin tức</h2>
            <nav className={styles.categories} aria-label="Danh mục tin tức">
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/tin-tuc?category=${key}`}
                  aria-current={news.category === key ? 'true' : undefined}
                >
                  {label}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </section>
          <section className={styles.sideSection}>
            <h2>Bài viết xem nhiều</h2>
            <div className={styles.popular}>
              {news.popular?.length ? (
                news.popular.map((item) => <NewsTeaser key={item.id} item={item} />)
              ) : (
                <p>Chưa có bài viết khác.</p>
              )}
            </div>
          </section>
          <Link href={news.promotion ? `/tin-tuc/${news.promotion.slug}` : "/tin-tuc?category=khuyen_mai"} className={styles.promotion}>
            <span>MOBIFONE SƠN LA</span>
            <h2>{news.promotion?.title || 'Khuyến mãi MobiFone'}</h2>
            <p>{news.promotion?.summary || 'Khám phá thông tin khuyến mãi từ MobiFone Sơn La.'}</p>
            <strong>
              Xem khuyến mãi <ArrowRight size={18} aria-hidden="true" />
            </strong>
          </Link>
        </aside>
      </div>
    </div>
  );
}
