import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { newsApi } from '@/lib/api/news';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { ArticleBody } from './_components/ArticleBody';

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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const news = await newsApi.getPublicBySlug(params.slug);
    return buildMetadata({
      title: news.title,
      description: news.summary,
      image: news.thumbnail,
      path: `/tin-tuc/${news.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Tin tức', path: `/tin-tuc/${params.slug}` });
  }
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  let news;
  try {
    news = await newsApi.getPublicBySlug(params.slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Tin tức', href: '/tin-tuc' }, { label: news.title }]} />
      <div className="mx-auto mt-4 max-w-3xl">
        <Badge tone="accent">{CATEGORY_LABEL[news.category] ?? news.category}</Badge>
        <h1 className="mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">{news.title}</h1>
        <div className="mt-6">
          <ArticleBody news={news} />
        </div>
      </div>
    </div>
  );
}
