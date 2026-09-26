import { apiFetch } from './client';
import { News, Package, SimNumber, Solution, Store } from '@/types/product';

export interface SearchResult {
  news: News[];
  packages: Package[];
  sims: SimNumber[];
  solutions: Solution[];
  stores: Store[];
}

export const searchApi = {
  search: (q: string) =>
    apiFetch<SearchResult>('/public/search', { params: { q }, cache: 'no-store' }),
};
