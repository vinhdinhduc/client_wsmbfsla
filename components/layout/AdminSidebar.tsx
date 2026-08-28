'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { menuForRole } from '@/lib/rbac';
import { cn } from '@/lib/cn';

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const menu = user ? menuForRole(user.role) : [];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-100 bg-white sm:flex">
      <div className="flex h-16 items-center gap-2 border-b border-neutral-100 px-5">
        <span className="font-heading text-lg font-bold text-primary">MobiFone Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {menu.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive ? 'bg-primary text-white' : 'text-neutral-900 hover:bg-neutral-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Thanh icon thu gon cho man hinh nho (< sm) - cung du lieu menu, chi hien icon. */
export function AdminSidebarMobile() {
  const pathname = usePathname();
  const { user } = useAuth();
  const menu = user ? menuForRole(user.role) : [];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-neutral-100 bg-white py-1.5 sm:hidden">
      {menu.slice(0, 5).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={cn('flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5', isActive ? 'text-primary' : 'text-neutral-500')}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </nav>
  );
}
