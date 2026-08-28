import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { packagesApi } from '@/lib/api/packages';
import { simsApi } from '@/lib/api/sims';
import { solutionsApi } from '@/lib/api/solutions';
import { newsApi } from '@/lib/api/news';
import { PackageCard, SimCard, NewsCard, SolutionCard } from '@/components/ui/Card';
import { SliderZone } from '@/components/shared/SliderZone';

export const revalidate = 60;

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-heading text-xl font-bold text-neutral-900 sm:text-2xl">{title}</h2>
      <Link href={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        Xem tất cả <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [hotPackages, hotSims, solutions, newsResult] = await Promise.all([
    packagesApi.listPublic('hot', { next: { revalidate: 60 } }),
    simsApi.listPublic({}, { cache: 'no-store' }),
    solutionsApi.listPublic(undefined, { next: { revalidate: 60 } }),
    newsApi.listPublic({ page_size: 3 }, { next: { revalidate: 60 } }),
  ]);

  return (
    <div className="space-y-12 py-6 sm:space-y-16 sm:py-10">
      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <SliderZone zoneCode="hero_banner" aspectClassName="aspect-[16/9] sm:aspect-[21/9]" />
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Gói cước nổi bật" href="/goi-cuoc" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotPackages.slice(0, 4).map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Sim số đẹp nổi bật" href="/sim-so-dep" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotSims.slice(0, 4).map((sim) => (
            <SimCard key={sim.id} sim={sim} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Giải pháp số cho Doanh nghiệp / UBND" href="/giai-phap-so" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.slice(0, 3).map((solution) => (
            <SolutionCard key={solution.id} solution={solution} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Tin tức & Khuyến mãi" href="/tin-tuc" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsResult.items.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center font-heading text-xl font-bold text-neutral-900">Đối tác & Thương hiệu</h2>
        <SliderZone zoneCode="partners" aspectClassName="aspect-[4/1]" />
      </section>

      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-center font-heading text-xl font-bold text-neutral-900">Khách hàng nói gì về chúng tôi</h2>
        <SliderZone zoneCode="testimonials" aspectClassName="aspect-[16/9] sm:aspect-[21/9]" />
      </section>
    </div>
  );
}
