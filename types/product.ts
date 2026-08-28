export type PackageGroupType = 'hot' | 'tra_truoc' | 'tra_sau' | 'wifi_5g';
export type PackageDurationUnit = 'ngay' | 'thang';
export type PackageStatus = 'active' | 'inactive';

export interface Package {
  id: number;
  code: string;
  name: string;
  slug: string;
  group_type: PackageGroupType;
  headline_desc: string | null;
  price: number;
  duration_value: number;
  duration_unit: PackageDurationUnit;
  data_desc: string | null;
  call_desc: string | null;
  sms_desc: string | null;
  speed_desc: string | null;
  description: string | null;
  status: PackageStatus;
  display_order: number;
}

export type SimCatalog = 'so_dep' | 'phong_thuy' | 'nam_sinh' | 'tra_truoc' | 'sim_data' | 'esim';
export type SimType = 'tam_hoa' | 'tu_quy' | 'phat_loc' | 'than_tai' | 'thuong';
export type SimStatus = 'available' | 'reserved' | 'sold';

export interface SimNumber {
  id: number;
  phone_number: string;
  prefix: string;
  catalog: SimCatalog;
  sim_type: SimType;
  price: number;
  bundle_note: string | null;
  commitment_months: number | null;
  status: SimStatus;
  created_at: string;
}

export type SolutionCategory = 'sme' | 'ubnd' | 'ho_kinh_doanh' | 'cuc_nganh';
export type SolutionStatus = 'active' | 'inactive';

export interface Solution {
  id: number;
  name: string;
  slug: string;
  category: SolutionCategory;
  thumbnail: string | null;
  summary: string | null;
  content: string;
  is_hot: boolean;
  status: SolutionStatus;
}

export type NewsCategory = 'khuyen_mai' | 'su_kien' | 'thong_bao';
export type NewsStatus = 'draft' | 'published';

export interface News {
  id: number;
  title: string;
  slug: string;
  category: NewsCategory;
  thumbnail: string | null;
  summary: string | null;
  content: string;
  status: NewsStatus;
  author_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  district: string;
  phone: string;
  lat: number;
  lng: number;
  opening_hours: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
