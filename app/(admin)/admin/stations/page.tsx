'use client';

import { useAuth } from '@/hooks/useAuth';
import StationDashboard from '@/components/stations/StationDashboard';

export default function StationsPage() {
  const { user } = useAuth();
  if (!user) return <p>Đang kiểm tra đăng nhập…</p>;
  if (user.role !== 'admin') return <p>Bạn không có quyền xem dữ liệu trạm BTS.</p>;
  return <StationDashboard />;
}
