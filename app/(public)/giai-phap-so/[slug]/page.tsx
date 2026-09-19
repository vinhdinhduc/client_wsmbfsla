import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { solutionsApi } from '@/lib/api/solutions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { SolutionContent } from './_components/SolutionContent';
import styles from './page.module.scss';

export const revalidate = 60;

const CATEGORY_LABEL: Record<string, string> = {
  sme: 'Doanh nghiệp (SME)',
  ubnd: 'UBND',
  ho_kinh_doanh: 'Hộ kinh doanh',
  cuc_nganh: 'Cục / Ngành',
  chuyen_doi_so: 'Chuyển đổi số',
};

export async function generateStaticParams() {
  try {
    const solutions = await solutionsApi.listPublic();
    return solutions.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const solution = await solutionsApi.getPublicBySlug(params.slug);
    return buildMetadata({
      title: solution.name,
      description: solution.summary,
      image: solution.thumbnail,
      path: `/giai-phap-so/${solution.slug}`,
    });
  } catch {
    return buildMetadata({ title: 'Giải pháp số', path: `/giai-phap-so/${params.slug}` });
  }
}

export default async function SolutionDetailPage({ params }: { params: { slug: string } }) {
  let solution;
  try {
    solution = await solutionsApi.getPublicBySlug(params.slug, { next: { revalidate: 60 } });
  } catch {
    notFound();
  }
  const related = (await solutionsApi.listPublic(undefined, { next: { revalidate: 60 } }))
    .filter((item) => item.category === solution.category && item.id !== solution.id)
    .slice(0, 3);

  return (
    <div className={styles.page}>
      <Breadcrumb
        items={[{ label: 'Giải pháp số', href: '/giai-phap-so' }, { label: solution.name }]}
      />
      <div className={styles.content}>
        <div className={styles.headerRow}>
          {solution.is_hot && <Badge tone="accent">HOT</Badge>}
          <Badge tone="primary">{CATEGORY_LABEL[solution.category] ?? solution.category}</Badge>
        </div>
        <h1 className={styles.title}>{solution.name}</h1>
        {solution.summary && <p className={styles.summary}>{solution.summary}</p>}
        <div className={styles.solutionBody}>
          <SolutionContent solution={solution} related={related} />
        </div>
      </div>
    </div>
  );
}
