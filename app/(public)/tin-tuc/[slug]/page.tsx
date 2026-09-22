import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { ArticleBody } from './_components/ArticleBody';
import styles from './page.module.scss';

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

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Tin tức', href: '/tin-tuc' }, { label: news.title }]} />
      <div className={styles.content}>
        <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
        <h1 className={styles.title}>{news.title}</h1>
        <div className={styles.body}>
          <ArticleBody news={news} />
        </div>
      </div>
    </div>
  );
}
