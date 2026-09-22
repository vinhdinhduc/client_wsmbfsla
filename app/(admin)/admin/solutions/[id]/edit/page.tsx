'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { solutionsApi } from '@/lib/api/solutions';
import { SolutionEditor } from '../../SolutionEditor';

export default function EditSolutionPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-solution', id], queryFn: () => solutionsApi.getById(id), enabled: Number.isInteger(id) && id > 0 });
  if (isLoading) return <p>Đang tải giải pháp…</p>;
  if (error) return <p role="alert">{(error as Error).message}</p>;
  return data ? <SolutionEditor key={data.id} initial={data} /> : <p>Không tìm thấy giải pháp.</p>;
}
