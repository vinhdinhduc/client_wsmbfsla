'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShoppingCart, Phone, Menu, X, LogIn, ChevronDown } from 'lucide-react';
import { useCurrentDutyStaff } from '@/hooks/useCurrentDutyStaff';
import { useCart } from '@/hooks/useCart';
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { count, openDrawer } = useCart();
  const { data: dutyStaff } = useCurrentDutyStaff();
  const prefersReducedMotion = useReducedMotion();

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
                <Link href={link.href} className={styles.header__navLink}>
                  {link.label}
                  <ChevronDown className={styles.header__navChevron} aria-hidden="true" />
                </Link>
                <div className={styles.header__dropdownMenu}>
                  {link.children.map((child) => (
                    <Link
                      key={child.href + child.label}
                      href={child.href}
                      className={styles.header__dropdownLink}
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
          <a
            href={`tel:${dutyStaff?.phone ?? ''}`}
            className={styles.header__contact}
            title={dutyStaff?.name}
          >
            <Phone className={styles.header__contactIcon} />
            {dutyStaff?.phone ?? '1800 xxxx'}
          </a>

          <Link href="/admin/login" className={styles.header__adminLogin}>
            <LogIn className={styles.header__adminLoginIcon} />
            <span>Đăng nhập quản trị</span>
          </Link>

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
                <LogIn className={styles.header__adminLoginIcon} />
                Đăng nhập quản trị
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
