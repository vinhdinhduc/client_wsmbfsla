export type CartItemType = 'sim' | 'goi_cuoc' | 'giai_phap';

/** 1 dong trong CartContext (localStorage) - chua du thong tin de hien thi CartDrawer/gio hang. */
export interface CartItem {
  /** Khoa duy nhat trong gio: `${type}-${reference_id}` */
  key: string;
  type: CartItemType;
  reference_id: number;
  name: string;
  price: number | null;
  image: string | null;
}

export type RegistrationStatus = 'moi' | 'dang_xu_ly' | 'hoan_thanh' | 'huy';

export interface RegistrationItem {
  id: number;
  registration_group_id: number;
  type: CartItemType;
  reference_id: number;
  reference_label: string;
  price_snapshot: number | null;
}

export interface RegistrationGroup {
  id: number;
  customer_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  delivery_address: string;
  delivery_store?: string | null;
  note: string | null;
  status: RegistrationStatus;
  assigned_to: number | null;
  created_at: string;
  items: RegistrationItem[];
}

export interface SubmitCartPayload {
  customer_name: string;
  phone: string;
  note?: string | null;
  items: Array<{ type: CartItemType; reference_id: number }>;
  recaptcha_token: string;
}

export type ContactStatus = 'moi' | 'da_xu_ly';

export interface ContactMessage {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}
