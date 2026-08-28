import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { solutionsApi } from '@/lib/api/solutions';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/metadata';
import { SolutionContent } from './_components/SolutionContent';

export const revalidate = 60;

const CATEGORY_LABEL: Record<string, string> = {
  sme: 'Doanh nghiệp (SME)',
  ubnd: 'UBND',
  ho_kinh_doanh: 'Hộ kinh doanh',
  cuc_nganh: 'Cục / Ngành',
};

export async function generateStaticParams() {
  try {
    const solutions = await solutionsApi.listPublic();
    return solutions.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
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

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Giải pháp số', href: '/giai-phap-so' }, { label: solution.name }]} />
      <div className="mx-auto mt-4 max-w-3xl">
        <div className="flex items-center gap-2">
          {solution.is_hot && <Badge tone="accent">HOT</Badge>}
          <Badge tone="primary">{CATEGORY_LABEL[solution.category] ?? solution.category}</Badge>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">{solution.name}</h1>
        {solution.summary && <p className="mt-2 text-neutral-500">{solution.summary}</p>}
        <div className="mt-6">
          <SolutionContent solution={solution} />
        </div>
      </div>
    </div>
  );
}
