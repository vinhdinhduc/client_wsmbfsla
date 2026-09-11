'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SimCard, PackageCard, NewsCard } from '@/components/ui/Card';
import styles from './page.module.scss';

/**
 * Trang tim kiem tong hop - Client Component (CSR), khong can SEO, noi dung
 * phu thuoc hanh vi tung khach (muc 12 dau bai). Nhan tu khoa tu o tim kiem o
 * Header, goi lai cung 1 API GET /api/public/search?q=.
 */
function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['search-page', q],
    queryFn: () => searchApi.search(q),
    enabled: q.length > 0,
  });

  const hasResults =
    data && (data.sims.length > 0 || data.packages.length > 0 || data.news.length > 0);

  return (
    <div className={styles.page}>
      <Breadcrumb items={[{ label: 'Tìm kiếm' }]} />
      <h1 className={styles.title}>Kết quả tìm kiếm cho &quot;{q}&quot;</h1>

      {isLoading ? (
        <p className={styles.empty}>Đang tìm kiếm...</p>
      ) : !hasResults ? (
        <p className={styles.empty}>Không tìm thấy kết quả phù hợp</p>
      ) : (
        <div className={styles.results}>
          {data!.sims.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Sim số đẹp</h2>
              <div className={styles.gridFour}>
                {data!.sims.map((sim) => (
                  <SimCard key={sim.id} sim={sim} />
                ))}
              </div>
            </section>
          )}
          {data!.packages.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Gói cước</h2>
              <div className={styles.gridFour}>
                {data!.packages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            </section>
          )}
          {data!.news.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Tin tức</h2>
              <div className={styles.gridThree}>
                {data!.news.map((news) => (
                  <NewsCard key={news.id} news={news} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
