'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Menu, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { usePathname } from 'next/navigation';
import { ADMIN_MENU } from '@/lib/rbac';
import styles from './AdminHeader.module.scss';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  chuyen_vien: 'Chuyên viên',
  giao_dich_vien: 'Giao dịch viên',
  nhan_vien: 'Nhân viên',
};

export function AdminHeader({
  onMenuToggle,
  menuOpen,
}: {
  onMenuToggle: () => void;
  menuOpen: boolean;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const settingsTitle: Record<string, string> = {
    '/admin/ai-settings': 'AI Chatbot',
    '/admin/ai-knowledge': 'Dữ liệu tri thức AI',
    '/admin/ai-chat-logs': 'Lịch sử hội thoại',
    '/admin/email': 'Email',
    '/admin/rate-limits': 'Bảo mật & giới hạn',
  };
  const pageTitle =
    settingsTitle[pathname] ??
    ADMIN_MENU.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      ?.label ??
    'Tổng quan';

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/admin/login');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Đăng xuất thất bại', 'error');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuToggle}
          aria-label="Mở menu"
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
        >
          <Menu />
        </button>
        <span className={styles.brandLogo} aria-hidden="true">
          <Image src="/logo_ngan_cropped.png" alt="" width={48} height={48} priority />
        </span>
        <div>
          <p className={styles.eyebrow}>MobiFone Admin</p>
          <h1 className={styles.title}>{pageTitle}</h1>
        </div>
      </div>
      <div className={styles.account}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
        >
          {theme === 'light' ? <Moon /> : <Sun />}
        </button>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            <UserIcon className={styles.avatarIcon} />
          </div>
          <div className={styles.userInfo}>
            <p className={styles.name}>{user?.full_name}</p>
            <p className={styles.role}>{user ? ROLE_LABEL[user.role] : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Đăng xuất"
          className={styles.logout}
        >
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
