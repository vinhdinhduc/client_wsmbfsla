export type PackageGroupType = 'hot' | 'tra_truoc' | 'tra_sau' | 'wifi_5g';
export type PackageDurationUnit = 'ngay' | 'thang';
export type PackageStatus = 'active' | 'inactive' | 'hidden';

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
  service_type?: 'mobile' | 'data' | 'wifi_5g' | 'combo';
  subscription_type?: 'prepaid' | 'postpaid' | 'none';
  badges?: Array<'hot' | 'new' | 'bestseller'>;
  sms_syntax?: string | null;
  image_url?: string | null;
  conditions?: string | null;
  audience?: string | null;
  data_per_day_gb?: number | null;
  data_per_cycle_gb?: number | null;
  unlimited_data?: boolean;
  benefits?: string[] | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type SimCatalog = 'so_dep' | 'phong_thuy' | 'nam_sinh' | 'tra_truoc' | 'sim_data' | 'esim';
export type SimType = 'tam_hoa' | 'tu_quy' | 'phat_loc' | 'than_tai' | 'thuong';
export type SimStatus = 'available' | 'reserved' | 'sold' | 'hidden';
export type SubscriptionType = 'prepaid' | 'postpaid';

export interface SimNumber {
  id: number;
  phone_number: string;
  prefix: string;
  subscription_type: SubscriptionType;
  catalog: SimCatalog;
  sim_type: SimType;
  price: number | null;
  activation_fee: number;
  needs_review: boolean;
  bundle_note: string | null;
  commitment_months: number | null;
  status: SimStatus;
  created_at: string;
}

export type SolutionCategory = 'sme' | 'ubnd' | 'ho_kinh_doanh' | 'cuc_nganh' | 'chuyen_doi_so';
export type SolutionStatus = 'active' | 'inactive';

export interface Solution {
  id: number;
  name: string;
  slug: string;
  category: SolutionCategory;
  thumbnail: string | null;
  summary: string | null;
  content: string;
  target_customers: string | null;
  legal_basis: string | null;
  brochure_url: string | null;
  video_url: string | null;
  is_hot: boolean;
  status: SolutionStatus;
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  audience_cards?: Array<{ icon: string; title: string; description: string }> | null;
  section_visibility?: Record<string, boolean> | null;
  section_titles?: Record<string, string> | null;
  seo_title?: string | null;
  seo_description?: string | null;
  features?: SolutionFeature[];
  pricing?: SolutionPricing[];
  faqs?: SolutionFaq[];
  gallery?: SolutionGallery[];
  steps?: Array<{ id: number; title: string; description: string | null; icon: string | null; sort_order: number }>;
}

export interface SolutionFeature {
  id: number;
  icon: string | null;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface SolutionPricing {
  id: number;
  package_code: string;
  package_name: string;
  price: number;
  cycle_months: number;
  condition_note: string | null;
  sort_order: number;
  status?: 'active' | 'inactive';
}

export interface SolutionFaq {
  id: number;
  question: string;
  answer: string | null;
  sort_order: number;
}

export interface SolutionGallery {
  id: number;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export type NewsCategory = 'khuyen_mai' | 'su_kien' | 'thong_bao';
export type NewsStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface News {
  id: number;
  title: string;
  slug: string;
  category: NewsCategory;
  thumbnail: string | null;
  cover_url?: string | null;
  cover_alt?: string | null;
  summary: string | null;
  content: string;
  status: NewsStatus;
  author_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  view_count?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  preview_token?: string | null;
  tags?: string[];
  author_name?: string | null;
  related?: News[];
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
  province_code?: string | null;
  ward_code?: string | null;
  street_address?: string | null;
  full_address?: string | null;
  email?: string | null;
  opening_hours_json?: Array<{ days: number[]; open: string; close: string }> | null;
  needs_review?: boolean;
  status?: 'active' | 'inactive';
    open_now?: boolean | null;
    staff_count?: number;
    staff?: Array<{ id: number; full_name: string; job_title: string | null; avatar_url: string | null; public_phone: string; public_zalo: string | null; on_duty: boolean }>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
