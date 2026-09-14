'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  ChevronDown,
  BarChart3,
  Bot,
  CircleHelp,
  LayoutTemplate,
  PanelBottom,
  Home as HomeIcon,
  Globe2,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { menuForRole } from '@/lib/rbac';
import { cn } from '@/lib/cn';
import styles from './AdminSidebar.module.scss';

export function AdminSidebar({
  isMobileMenuOpen,
  onClose,
}: {
  isMobileMenuOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const menu = user ? menuForRole(user.role) : [];
  const isSettingsRoute = pathname.startsWith('/admin/settings');
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsRoute);

  const settingsItems = [
    { href: '/admin/settings?section=site', label: 'Thông tin website', icon: Globe2 },
    { href: '/admin/settings?section=footer', label: 'Giới thiệu & footer', icon: PanelBottom },
    { href: '/admin/settings?section=social', label: 'Mạng xã hội & hỗ trợ', icon: CircleHelp },
    { href: '/admin/settings?section=appearance', label: 'Giao diện', icon: LayoutTemplate },
    { href: '/admin/settings?section=chatbot', label: 'AI Chatbot', icon: Bot },
    { href: '/admin/settings?section=analytics', label: 'Đo lường', icon: BarChart3 },
  ];

  return (
    <aside className={cn(styles.sidebar, isMobileMenuOpen && styles.mobileOpen)}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          <Image src="/logo_ngan_cropped.png" alt="" width={64} height={64} priority />
        </span>
        <span className={styles.brandText}>MobiFone Admin</span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <X />
        </button>
      </div>
      <nav className={styles.nav}>
        {menu
          .filter((item) => item.href !== '/admin/settings')
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.link, isActive ? styles.active : styles.inactive)}
                onClick={onClose}
              >
                <Icon className={styles.icon} />
                {item.label}
              </Link>
            );
          })}
        {user?.role === 'admin' && (
          <div className={styles.settingsGroup}>
            <button
              type="button"
              className={cn(styles.link, styles.settingsButton, isSettingsRoute && styles.active)}
              onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
              aria-expanded={isSettingsOpen}
            >
              <SettingsIcon className={styles.icon} />
              <span>Cài đặt</span>
              <ChevronDown className={cn(styles.chevron, isSettingsOpen && styles.chevronOpen)} />
            </button>
            {isSettingsOpen && (
              <div className={styles.subnav}>
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === '/admin/settings' &&
                    searchParams.get('section') === item.href.split('=')[1];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        styles.subLink,
                        isActive ? styles.subActive : styles.subInactive,
                      )}
                      onClick={onClose}
                    >
                      <Icon className={styles.subIcon} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
      <div className={styles.sidebarFooter}>
        <Link href="/" target="_blank" className={styles.homeLink} onClick={onClose}>
          <HomeIcon className={styles.icon} />
          Xem trang chủ
        </Link>
        <span>Hệ thống quản trị nội bộ</span>
      </div>
    </aside>
  );
}
