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
      <AdminSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className={styles.content}>
        <AdminHeader onMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
