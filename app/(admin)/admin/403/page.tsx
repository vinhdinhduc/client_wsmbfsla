'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function Admin403Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldAlert className="h-16 w-16 text-danger" />
      <h1 className="font-heading text-2xl font-bold text-neutral-900">Bạn không có quyền truy cập</h1>
      <p className="max-w-md text-neutral-500">
        Tài khoản của bạn không đủ quyền để xem trang này. Vui lòng liên hệ Quản trị viên nếu bạn cho rằng đây là
        nhầm lẫn.
      </p>
      <Link href="/admin/dashboard" className="text-primary hover:underline">
        Quay về Tổng quan
      </Link>
    </div>
  );
}
