import { SimType } from '@/types/product';

export interface SimFilterParams {
  q?: string;
  prefix?: string;
  catalog?: string;
  sim_type?: SimType;
  price_range?: string;
  type?: string;
}

export interface SimSearchParams {
  q?: string | string[];
  prefix?: string | string[];
  tab?: string | string[];
  type?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}

export interface NormalizedSimFilters {
  q: string;
  prefix: string;
  tab: 'all' | 'so_dep' | 'phong_thuy' | 'nam_sinh';
  type: 'prepaid' | 'postpaid';
  page: number;
  pageSize: 10 | 20 | 50;
}
