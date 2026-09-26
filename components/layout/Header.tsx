'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShoppingCart, Phone, Menu, X, ChevronDown, Moon, Sun, Search, LogIn } from 'lucide-react';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { useCart } from '@/hooks/useCart';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { TextField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import styles from './Header.module.scss';

const NAV_LINKS: Array<
  | { href: string; label: string }
  | {
      href: string;
      label: string;
      children: Array<{ href: string; label: string }>;
    }
> = [
  { href: '/', label: 'Trang chủ' },
  { href: '/sim-so-dep', label: 'Sim số đẹp' },
  { href: '/goi-cuoc', label: 'Gói cước' },
  { href: '/giai-phap-so', label: 'Giải pháp số' },
  { href: '/cua-hang', label: 'Cửa hàng' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/tien-ich', label: 'Tiện ích' },
  {
    href: '/gioi-thieu',
    label: 'Giới thiệu',
    children: [
      { href: '/lien-he', label: 'Liên hệ & Hỗ trợ' },
      { href: '/tuyen-dung', label: 'Tuyển dụng - Cơ hội nghề nghiệp' },
    ],
  },
];

export function Header() {
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { count, openDrawer } = useCart();
  const { data: dutyStaff } = useCurrentDutyStaff();
  const { theme, toggleTheme } = useTheme();
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setIsMobileNavOpen(false);
        setAboutOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = search.trim();
    if (value) {
      setSearchOpen(false);
      router.push(`/tim-kiem?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.header__inner}>
        <Link href="/" className={styles.header__brand}>
          <Image
            className={styles.header__logo}
            src="/logo.png"
            alt="MobiFone Sơn La"
            width={140}
            height={32}
            sizes="(max-width: 639px) 108px, 140px"
            priority
          />
        </Link>

        <nav className={styles.header__nav}>
          {NAV_LINKS.map((link) =>
            'children' in link ? (
              <div key={link.href} className={styles.header__navDropdown}>
                <button
                  type="button"
                  aria-expanded={aboutOpen}
                  aria-controls="public-about-menu"
                  onClick={() => setAboutOpen((open) => !open)}
                  className={styles.header__navLink}
                >
                  {link.label}
                  <ChevronDown className={styles.header__navChevron} aria-hidden="true" />
                </button>
                <div
                  id="public-about-menu"
                  className={`${styles.header__dropdownMenu} ${aboutOpen ? styles.header__dropdownOpen : ''}`}
                >
                  <Link
                    href={link.href}
                    className={styles.header__dropdownLink}
                    onClick={() => setAboutOpen(false)}
                  >
                    Giới thiệu MobiFone Sơn La
                  </Link>
                  {link.children.map((child) => (
                    <Link
                      key={child.href + child.label}
                      href={child.href}
                      className={styles.header__dropdownLink}
                      onClick={() => setAboutOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={link.href} href={link.href} className={styles.header__navLink}>
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className={styles.header__tools}>
          <Link href="/admin/login" className={styles.header__adminLogin}>
            <LogIn className={styles.header__adminLoginIcon} aria-hidden="true" />
            Đăng nhập
          </Link>
          <button
            type="button"
            className={styles.header__iconButton}
            aria-label="Tìm kiếm (Ctrl K)"
            onClick={() => setSearchOpen(true)}
          >
            <Search className={styles.header__icon} />
          </button>
          <a
            href={`tel:${settings?.hotline ?? dutyStaff?.phone ?? ''}`}
            className={styles.header__contact}
            title={dutyStaff?.name}
            aria-label="Gọi hotline MobiFone"
          >
            <Phone className={styles.header__contactIcon} />
            <span className={styles.header__contactLabel}>
              {settings?.hotline ?? dutyStaff?.phone ?? '18001090'}
            </span>
          </a>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            className={styles.header__themeToggle}
          >
            {theme === 'light' ? <Moon /> : <Sun />}
          </button>

          <button
            type="button"
            onClick={openDrawer}
            aria-label="Xem giỏ hàng"
            className={styles.header__iconButton}
          >
            <ShoppingCart className={styles.header__icon} />
            {count > 0 && <span className={styles.header__cartCount}>{count}</span>}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileNavOpen((o) => !o)}
            aria-label={isMobileNavOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={isMobileNavOpen}
            aria-controls="public-mobile-menu"
            className={`${styles.header__iconButton} ${styles['header__iconButton--menu']}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMobileNavOpen ? 'x' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              >
                {isMobileNavOpen ? (
                  <X className={styles.header__icon} />
                ) : (
                  <Menu className={styles.header__icon} />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.nav
            id="public-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
            className={styles.header__mobileNav}
          >
            <div className={styles.header__mobileNavInner}>
              {NAV_LINKS.map((link) => (
                <div key={link.href} className={styles.header__mobileNavGroup}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={styles.header__mobileNavLink}
                  >
                    {link.label}
                    {'children' in link && (
                      <ChevronDown className={styles.header__mobileNavChevron} />
                    )}
                  </Link>
                  {'children' in link && (
                    <div className={styles.header__mobileSubnav}>
                      {link.children.map((child) => (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          onClick={() => setIsMobileNavOpen(false)}
                          className={styles.header__mobileSubnavLink}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link
                href="/admin/login"
                onClick={() => setIsMobileNavOpen(false)}
                className={styles.header__mobileAdminLogin}
              >
                <LogIn className={styles.header__adminLoginIcon} aria-hidden="true" />
                Đăng nhập
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm toàn site"
          className={styles.searchOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <form onSubmit={submitSearch} className={styles.searchPanel}>
            <TextField
              label="Tìm kiếm"
              id="global-search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sim, gói cước, tin tức, cửa hàng…"
            />
            <Button type="submit">Tìm</Button>
            <Button type="button" variant="ghost" onClick={() => setSearchOpen(false)}>
              Đóng
            </Button>
            <small>Nhấn Esc để đóng · Ctrl/⌘ K để mở</small>
          </form>
        </div>
      )}
    </header>
  );
}
