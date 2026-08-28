'use client';

import { useState } from 'react';
import { Database, Phone, MessageSquare, Gauge } from 'lucide-react';
import { Package } from '@/types/product';
import { Tabs } from '@/components/ui/Tabs';
import { PackageDetailTab } from '../_types/packageDetail';

const TABS = [
  { value: 'overview' as const, label: 'Tổng quan' },
  { value: 'benefits' as const, label: 'Ưu đãi kèm theo' },
  { value: 'terms' as const, label: 'Điều khoản' },
];

export function PackageDetailTabs({ pkg }: { pkg: Package }) {
  const [tab, setTab] = useState<PackageDetailTab>('overview');

  return (
    <div>
      <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as PackageDetailTab)} />
      <div className="py-6">
        {tab === 'overview' && (
          <div className="prose prose-sm max-w-none text-neutral-900">
            {pkg.description ? (
              <div dangerouslySetInnerHTML={{ __html: pkg.description }} />
            ) : (
              <p className="text-neutral-500">Chưa có mô tả chi tiết cho gói cước này.</p>
            )}
          </div>
        )}

        {tab === 'benefits' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BenefitItem icon={Database} label="Data" value={pkg.data_desc} />
            <BenefitItem icon={Phone} label="Gọi thoại" value={pkg.call_desc} />
            <BenefitItem icon={MessageSquare} label="SMS" value={pkg.sms_desc} />
            <BenefitItem icon={Gauge} label="Tốc độ" value={pkg.speed_desc} />
          </div>
        )}

        {tab === 'terms' && (
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-900">
            <li>Chu kỳ gói cước: {pkg.duration_value} {pkg.duration_unit}, tự động gia hạn nếu tài khoản đủ tiền.</li>
            <li>Không tích hợp thanh toán trực tuyến - nhân viên sẽ liên hệ xác nhận sau khi đăng ký.</li>
            <li>Vui lòng liên hệ tổng đài để biết thêm chi tiết điều kiện áp dụng.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function BenefitItem({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-neutral-100 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-semibold text-neutral-900">{label}</p>
        <p className="text-sm text-neutral-500">{value}</p>
      </div>
    </div>
  );
}
