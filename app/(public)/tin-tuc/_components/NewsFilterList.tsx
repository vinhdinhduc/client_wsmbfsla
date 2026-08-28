'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { newsApi } from '@/lib/api/news';
import { NewsCard } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { News, NewsCategory, PaginatedResult } from '@/types/product';

const CATEGORY_TABS: Array<{ value: NewsCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'khuyen_mai', label: 'Khuyến mãi' },
  { value: 'su_kien', label: 'Sự kiện' },
  { value: 'thong_bao', label: 'Thông báo' },
];

const PAGE_SIZE = 9;

export function NewsFilterList({ initialData }: { initialData: PaginatedResult<News> }) {
  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['news-list', category, page],
    queryFn: () =>
      newsApi.listPublic({ category: category === 'all' ? undefined : category, page, page_size: PAGE_SIZE }),
    initialData: category === 'all' && page === 1 ? initialData : undefined,
  });

  function handleCategoryChange(value: string) {
    setCategory(value as NewsCategory | 'all');
    setPage(1);
  }

  const result = data ?? initialData;

  return (
    <div>
      <Tabs tabs={CATEGORY_TABS} value={category} onChange={handleCategoryChange} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.length === 0 ? (
          <p className="col-span-full py-12 text-center text-neutral-500">Chưa có tin tức trong mục này</p>
        ) : (
          result.items.map((news) => <NewsCard key={news.id} news={news} />)
        )}
      </div>

      <div className="mt-8">
        <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={setPage} />
      </div>
    </div>
  );
}
