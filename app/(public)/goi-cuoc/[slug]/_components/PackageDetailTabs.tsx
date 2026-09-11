'use client';

import { useState } from 'react';
import { Database, Phone, MessageSquare, Gauge } from 'lucide-react';
import { Package } from '@/types/product';
import { Tabs } from '@/components/ui/Tabs';
import { PackageDetailTab } from '../_types/packageDetail';
import styles from './PackageDetailTabs.module.scss';

const TABS = [
  { value: 'overview' as const, label: 'Tổng quan' },
  { value: 'benefits' as const, label: 'Ưu đãi kèm theo' },
  { value: 'terms' as const, label: 'Điều khoản' },
];

export function PackageDetailTabs({ pkg }: { pkg: Package }) {
  const [tab, setTab] = useState<PackageDetailTab>('overview');

  return (
    <div className={styles.container}>
      <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as PackageDetailTab)} />
      <div className={styles.tabsContent}>
        {tab === 'overview' && (
          <div className={styles.content}>
            {pkg.description ? (
              <div dangerouslySetInnerHTML={{ __html: pkg.description }} />
            ) : (
              <p className={styles.empty}>Chưa có mô tả chi tiết cho gói cước này.</p>
            )}
          </div>
        )}

        {tab === 'benefits' && (
          <div className={styles.grid}>
            <BenefitItem icon={Database} label="Data" value={pkg.data_desc} />
            <BenefitItem icon={Phone} label="Gọi thoại" value={pkg.call_desc} />
            <BenefitItem icon={MessageSquare} label="SMS" value={pkg.sms_desc} />
            <BenefitItem icon={Gauge} label="Tốc độ" value={pkg.speed_desc} />
          </div>
        )}

        {tab === 'terms' && (
          <ul className={styles.list}>
            <li>
              Chu kỳ gói cước: {pkg.duration_value} {pkg.duration_unit}, tự động gia hạn nếu tài
              khoản đủ tiền.
            </li>
            <li>
              Không tích hợp thanh toán trực tuyến - nhân viên sẽ liên hệ xác nhận sau khi đăng ký.
            </li>
            <li>Vui lòng liên hệ tổng đài để biết thêm chi tiết điều kiện áp dụng.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function BenefitItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className={styles.item}>
      <Icon className={styles.icon} />
      <div>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
}
