import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { packagesApi } from '@/lib/api/packages';
import { simsApi } from '@/lib/api/sims';
import { solutionsApi } from '@/lib/api/solutions';
import { newsApi } from '@/lib/api/news';
import { NewsCard, SolutionCard } from '@/components/ui/Card';
import { SliderZone } from '@/components/shared/SliderZone';
import { HomeCatalogSections } from '@/components/home/HomeCatalogSections';

export const revalidate = 60;

import styles from './page.module.scss';

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

export default async function HomePage() {
  const [packages, hotSims, solutions, newsResult] = await Promise.all([
    packagesApi.listPublic(undefined, { next: { revalidate: 60 } }),
    simsApi.listPublic({}, { cache: 'no-store' }),
    solutionsApi.listPublic(undefined, { next: { revalidate: 60 } }),
    newsApi.listPublic({ page_size: 3 }, { next: { revalidate: 60 } }),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <SliderZone zoneCode="hero_banner" aspect="hero" className={styles.heroSlider} />
      </section>

      <HomeCatalogSections packages={packages} sims={hotSims} />

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

      <section className={styles.section}>
        <h2 className={styles.centerTitle}>Đối tác & Thương hiệu</h2>
        <SliderZone zoneCode="partners" aspect="partners" />
      </section>

      <section className={styles.section}>
        <h2 className={styles.centerTitle}>Khách hàng nói gì về chúng tôi</h2>
        <SliderZone zoneCode="testimonials" aspect="hero" />
      </section>
    </div>
  );
}
