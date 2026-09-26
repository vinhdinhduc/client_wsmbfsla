'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { isRouteAllowedForRole } from '@/lib/rbac';
import styles from './AdminLayoutClient.module.scss';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/403'];

/**
 * AdminLayout - 'use client', kiem tra role (muc 13 dau bai). middleware.ts da
 * chan o tang Edge; layout nay la lop phong ve thu hai o client (vd token het
 * han giua session ma middleware chua kip bat) - bao mat that su van o backend.
 */
export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isPublicPath = PUBLIC_ADMIN_PATHS.includes(pathname);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById('admin-navigation');
    const content = document.getElementById('admin-content');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    content?.setAttribute('inert', '');
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      ).filter((el) => el.getClientRects().length);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const media = window.matchMedia('(min-width: 1024px)');
    const onResize = () => {
      if (media.matches) setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    media.addEventListener('change', onResize);
    return () => {
      document.body.style.overflow = overflow;
      content?.removeAttribute('inert');
      window.removeEventListener('keydown', onKey);
      media.removeEventListener('change', onResize);
      previous?.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isLoading || isPublicPath) return;
    if (!isAuthenticated) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !isRouteAllowedForRole(pathname, user.role)) {
      router.replace('/admin/403');
    }
  }, [isLoading, isPublicPath, isAuthenticated, user, pathname, router]);

  if (isPublicPath) return <>{children}</>;

  if (isLoading || !isAuthenticated) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.loader} />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {isMobileMenuOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Đóng menu"
          className={styles.overlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <AdminSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div id="admin-content" className={styles.content}>
        <AdminHeader
          menuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
