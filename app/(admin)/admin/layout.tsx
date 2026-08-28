import { Metadata } from 'next';
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient';

// Trang /admin/* khong can toi uu SEO nhung van phai chan bot crawl (muc 3.2/12 dau bai).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
