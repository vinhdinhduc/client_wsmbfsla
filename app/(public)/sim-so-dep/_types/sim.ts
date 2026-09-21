import { SimType } from '@/types/product';

export interface SimFilterParams {
  q?: string;
  prefix?: string;
  catalog?: string;
  sim_type?: SimType;
  price_range?: string;
  type?: 'prepaid' | 'postpaid';
}
