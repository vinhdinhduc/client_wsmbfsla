import { apiFetch } from './client';
import { News, Package, SimNumber } from '@/types/product';

export interface SearchResult {
  news: News[];
  packages: Package[];
  sims: SimNumber[];
}

export const searchApi = {
  search: (q: string) => apiFetch<SearchResult>('/public/search', { params: { q }, cache: 'no-store' }),
};
