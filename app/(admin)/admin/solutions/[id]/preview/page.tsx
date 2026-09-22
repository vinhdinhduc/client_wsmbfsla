'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { solutionsApi } from '@/lib/api/solutions';
import { SolutionContent } from '@/app/(public)/giai-phap-so/[slug]/_components/SolutionContent';

export default function PreviewSolutionPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ['preview-solution', id], queryFn: () => solutionsApi.getById(Number(id)), enabled: Boolean(id) });
  if (isLoading) return <p>Đang tải bản xem trước…</p>;
  if (error) return <p role="alert">{(error as Error).message}</p>;
  return data ? <main><p>Bản xem trước · {data.status === 'active' ? 'Đang đăng' : 'Nháp'}</p><SolutionContent solution={data} /></main> : <p>Không tìm thấy giải pháp.</p>;
}
