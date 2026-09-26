import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { ArticleBody } from './_components/ArticleBody';
import styles from './page.module.scss';
import Link from 'next/link';
import { ShareButtons } from './_components/ShareButtons';

export const revalidate = 60;

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
    if ('redirect' in news) return buildMetadata({ title: 'Tin tức', path: `/tin-tuc/${news.redirect}` });
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
  const jsonLd = {'@context':'https://schema.org','@type':'NewsArticle',headline:news.title,description:news.summary,image:news.cover_url||news.thumbnail,datePublished:news.published_at,dateModified:news.updated_at,author:{'@type':'Organization',name:news.author_name||'MobiFone Sơn La'}};

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/>
      <Breadcrumb items={[{ label: 'Tin tức', href: '/tin-tuc' }, { label: news.title }]} />
      <div className={styles.content}>
        <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
        <h1 className={styles.title}>{news.title}</h1>
        <div className={styles.body}>
          <ArticleBody news={news} />
        </div>
        <ShareButtons />
        {news.related && news.related.length > 0 && <section><h2>Tin liên quan</h2>{news.related.map(item=><p key={item.id}><Link href={`/tin-tuc/${item.slug}`}>{item.title}</Link></p>)}</section>}
      </div>
    </div>
  );
}
