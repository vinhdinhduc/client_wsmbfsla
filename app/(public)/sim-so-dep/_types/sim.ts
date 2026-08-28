import { SimType } from '@/types/product';

export interface SimFilterParams {
  prefix?: string;
  sim_type?: SimType;
  price_range?: string;
}
