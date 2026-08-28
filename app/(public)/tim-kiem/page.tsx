'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SimCard, PackageCard, NewsCard } from '@/components/ui/Card';

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

  const hasResults = data && (data.sims.length > 0 || data.packages.length > 0 || data.news.length > 0);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Tìm kiếm' }]} />
      <h1 className="mb-6 mt-3 font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
        Kết quả tìm kiếm cho &quot;{q}&quot;
      </h1>

      {isLoading ? (
        <p className="py-12 text-center text-neutral-500">Đang tìm kiếm...</p>
      ) : !hasResults ? (
        <p className="py-12 text-center text-neutral-500">Không tìm thấy kết quả phù hợp</p>
      ) : (
        <div className="space-y-10">
          {data!.sims.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-xl font-semibold text-neutral-900">Sim số đẹp</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data!.sims.map((sim) => <SimCard key={sim.id} sim={sim} />)}
              </div>
            </section>
          )}
          {data!.packages.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-xl font-semibold text-neutral-900">Gói cước</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data!.packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
              </div>
            </section>
          )}
          {data!.news.length > 0 && (
            <section>
              <h2 className="mb-4 font-heading text-xl font-semibold text-neutral-900">Tin tức</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data!.news.map((news) => <NewsCard key={news.id} news={news} />)}
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
