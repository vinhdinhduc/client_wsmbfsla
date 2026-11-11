import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { packagesApi } from '@/lib/api/packages';
import { solutionsApi } from '@/lib/api/solutions';
import { newsApi } from '@/lib/api/news';
import { NewsCard, SolutionCard } from '@/components/ui/Card';
import { SliderZone } from '@/components/shared/SliderZone';
import { HomeCatalogSections } from '@/components/home/HomeCatalogSections';
import { utilitiesApi } from '@/lib/api/utilities';
import { Lightbulb } from 'lucide-react';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

import styles from './page.module.scss';
import type { NormalizedSimFilters } from './sim-so-dep/_types/sim';

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <Link href={href} className={styles.viewAll}>
        Xem tất cả <ArrowRight className={styles.viewAllIcon} />
      </Link>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    q?: string | string[];
    prefix?: string | string[];
    type?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const value = (input: string | string[] | undefined) =>
    Array.isArray(input) ? input[0] ?? '' : input ?? '';
  const tabValue = value(params.tab);
  const initialSimFilters: NormalizedSimFilters = {
    tab: ['all', 'so_dep', 'phong_thuy', 'nam_sinh'].includes(tabValue)
      ? (tabValue as NormalizedSimFilters['tab'])
      : 'all',
    type: value(params.type) === 'postpaid' ? 'postpaid' : 'prepaid',
    q: value(params.q).trim(),
    prefix: value(params.prefix),
    page: 1,
    pageSize: 10,
  };
  const [packages, solutions, newsResult, utilities] = await Promise.all([
    packagesApi.listPublic(undefined, { next: { revalidate: 60 } }),
    solutionsApi.listPublic(undefined, { next: { revalidate: 60 } }),
    newsApi.listPublic({ page_size: 3 }, { next: { revalidate: 60 } }),
    utilitiesApi.list(4).catch(() => []),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <SliderZone zoneCode="hero_banner" aspect="hero" className={styles.heroSlider} />
      </section>

      <HomeCatalogSections packages={packages} initialSimFilters={initialSimFilters} />

      <section className={styles.section}>
        <SectionHeader title="Giải pháp số cho Doanh nghiệp / UBND" href="/giai-phap-so" />
        <div className={styles.grid3}>
          {solutions.slice(0, 3).map((solution) => (
            <SolutionCard key={solution.id} solution={solution} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader title="Tin tức & Khuyến mãi" href="/tin-tuc" />
        <div className={styles.grid3}>
          {newsResult.items.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </section>

      {utilities.length > 0 && (
        <section className={styles.section}>
          <SectionHeader title="Tiện ích" href="/tien-ich" />
          <div className={styles.utilityGrid}>
            {utilities.map((item) => (
              <article
                key={item.id}
                className={`${styles.utilityCard} ${utilities.length === 1 ? styles.utilityCardWide : ''}`}
              >
                <span className={styles.utilityIcon} aria-hidden="true">
                  <Lightbulb />
                </span>
                <div className={styles.utilityContent}>
                  <h3>{item.name}</h3>
                  <p>{item.summary}</p>
                </div>
                <Link href={`/tien-ich/${item.slug}`} className={styles.utilityLink}>
                  Chi tiết <ArrowRight className={styles.viewAllIcon} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.centerTitle}>Đối tác & Thương hiệu</h2>
        <SliderZone zoneCode="partners" aspect="partners" />
      </section>

      <section className={styles.section}>
        <h2 className={styles.centerTitle}>Khách hàng nói gì về chúng tôi</h2>
        <SliderZone zoneCode="testimonials" aspect="testimonial" />
      </section>
    </div>
  );
}
