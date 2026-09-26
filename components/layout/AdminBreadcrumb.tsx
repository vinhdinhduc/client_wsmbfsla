'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ADMIN_MENU } from '@/lib/rbac';
import styles from './AdminBreadcrumb.module.scss';

const settingsPages: Record<string, string> = {
  'ai-settings': 'AI Chatbot',
  'ai-knowledge': 'Dữ liệu tri thức AI',
  'ai-chat-logs': 'Lịch sử hội thoại',
  email: 'Email',
  'rate-limits': 'Bảo mật & giới hạn',
};
const sections: Record<string, string> = {
  site: 'Thông tin website',
  footer: 'Giới thiệu & footer',
  social: 'Mạng xã hội & hỗ trợ',
  appearance: 'Giao diện',
  chatbot: 'AI Chatbot',
  analytics: 'Đo lường',
  campaigns: 'Thông báo & popup',
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const search = useSearchParams();
  const segments = pathname.split('/').filter(Boolean);
  const section = search.get('section') ?? '';
  const settingTitle =
    settingsPages[segments[1]] || (segments[1] === 'settings' ? sections[section] : '');
  const menu = ADMIN_MENU.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const detail =
    segments.length > 2
      ? ({ new: 'Thêm mới', edit: 'Chỉnh sửa', preview: 'Xem trước' }[
          segments[segments.length - 1]
        ] ?? 'Chi tiết')
      : '';
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <Link href="/admin/dashboard">Quản trị</Link>
      <span aria-hidden="true">›</span>
      {settingTitle ? (
        <>
          <Link href="/admin/settings">Cài đặt</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{settingTitle}</span>
        </>
      ) : detail ? (
        <>
          <Link href={menu?.href ?? '/admin/dashboard'}>{menu?.label ?? 'Tổng quan'}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{detail}</span>
        </>
      ) : (
        <span aria-current="page">{menu?.label ?? 'Tổng quan'}</span>
      )}
    </nav>
  );
}
