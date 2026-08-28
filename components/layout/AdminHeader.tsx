'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  chuyen_vien: 'Chuyên viên',
  giao_dich_vien: 'Giao dịch viên',
  nhan_vien: 'Nhân viên',
};

export function AdminHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    <header className="flex h-16 items-center justify-between border-b border-neutral-100 bg-white px-4 sm:px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden text-right sm:block">
            <p className="font-medium text-neutral-900">{user?.full_name}</p>
            <p className="text-xs text-neutral-500">{user ? ROLE_LABEL[user.role] : ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
