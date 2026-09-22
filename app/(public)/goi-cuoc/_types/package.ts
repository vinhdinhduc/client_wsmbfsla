import { PackageGroupType } from '@/types/product';

export type PackageFilterState = PackageGroupType | 'all' | 'prepaid' | 'postpaid' | 'data';

export type PackageSortOption = 'default' | 'price_asc' | 'price_desc';
