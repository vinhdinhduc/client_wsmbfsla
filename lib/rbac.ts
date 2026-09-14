import type { UserRole } from '@/types/user';
import {
  Gauge,
  Newspaper,
  Package,
  Smartphone,
  Lightbulb,
  Store,
  ClipboardList,
  Mail,
  GalleryHorizontal,
  Send,
  Users,
  CalendarClock,
  CalendarDays,
  Settings,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

export interface AdminMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Vai tro nao duoc THAY menu nay (dung de an/hien UI cho gon - KHONG phai lop bao mat, muc 4). */
  roles: UserRole[];
}

export interface AdminSettingsItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Bang phan quyen hien thi Sidebar Admin - khop CHINH XAC voi muc 4 dau bai.
 * Day CHI la UX (an/hien menu cho gon giao dien). middleware.ts dung lai bang
 * nay o muc route-prefix de chan truy cap truc tiep bang URL, nhung bao mat
 * that su van nam o backend (moi request van gui kem JWT, backend tu loc).
 */
export const ADMIN_MENU: AdminMenuItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Tổng quan',
    icon: Gauge,
    roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'],
  },
  { href: '/admin/news', label: 'Tin tức', icon: Newspaper, roles: ['admin', 'chuyen_vien'] },
  { href: '/admin/packages', label: 'Gói cước', icon: Package, roles: ['admin', 'chuyen_vien'] },
  { href: '/admin/sims', label: 'Kho sim số', icon: Smartphone, roles: ['admin', 'chuyen_vien'] },
  {
    href: '/admin/solutions',
    label: 'Giải pháp số',
    icon: Lightbulb,
    roles: ['admin', 'chuyen_vien'],
  },
  { href: '/admin/stores', label: 'Cửa hàng', icon: Store, roles: ['admin', 'chuyen_vien'] },
  {
    href: '/admin/registrations',
    label: 'Đăng ký',
    icon: ClipboardList,
    roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'],
  },
  {
    href: '/admin/contacts',
    label: 'Liên hệ',
    icon: Mail,
    roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'],
  },
  {
    href: '/admin/sliders',
    label: 'Slider',
    icon: GalleryHorizontal,
    roles: ['admin', 'chuyen_vien'],
  },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Send, roles: ['admin', 'chuyen_vien'] },
  { href: '/admin/users', label: 'Tài khoản', icon: Users, roles: ['admin'] },
  { href: '/admin/shifts', label: 'Ca trực', icon: CalendarClock, roles: ['admin'] },
  {
    href: '/admin/appointments',
    label: 'Lịch hẹn',
    icon: CalendarDays,
    roles: ['admin', 'chuyen_vien', 'giao_dich_vien'],
  },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, roles: ['admin'] },
  { href: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText, roles: ['admin'] },
];

/** Danh sach prefix route + vai tro duoc phep, dung boi middleware.ts (khong dung JSX nen tach rieng). */
export const ADMIN_ROUTE_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/admin/users', roles: ['admin'] },
  { prefix: '/admin/shifts', roles: ['admin'] },
  { prefix: '/admin/appointments', roles: ['admin', 'chuyen_vien', 'giao_dich_vien'] },
  { prefix: '/admin/settings', roles: ['admin'] },
  { prefix: '/admin/audit-logs', roles: ['admin'] },
  { prefix: '/admin/news', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/packages', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/sims', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/solutions', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/stores', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/sliders', roles: ['admin', 'chuyen_vien'] },
  { prefix: '/admin/newsletter', roles: ['admin', 'chuyen_vien'] },
  {
    prefix: '/admin/registrations',
    roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'],
  },
  { prefix: '/admin/contacts', roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'] },
  { prefix: '/admin/dashboard', roles: ['admin', 'chuyen_vien', 'giao_dich_vien', 'nhan_vien'] },
];

export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  const rule = ADMIN_ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return true; // route khong nam trong bang (vd /admin/403) - khong chan
  return rule.roles.includes(role);
}

export function menuForRole(role: UserRole): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => item.roles.includes(role));
}
