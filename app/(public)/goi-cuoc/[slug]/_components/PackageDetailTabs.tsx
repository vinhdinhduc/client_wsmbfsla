'use client';

import { useState } from 'react';
import { Database, Phone, MessageSquare, Gauge, Users, Calendar, PackageOpen } from 'lucide-react';
import {
  packageData,
  packageDuration,
  packageBenefits,
  packageValidity,
} from '@/lib/package-display';
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

  const benefits = packageBenefits(pkg.benefits);
  const summary = [
    packageData(pkg) && `Data: ${packageData(pkg)}`,
    pkg.call_desc?.trim() && `Gọi thoại: ${pkg.call_desc}`,
    pkg.sms_desc?.trim() && `SMS: ${pkg.sms_desc}`,
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <div className={styles.container}>
      <Tabs tabs={TABS} value={tab} onChange={(v) => setTab(v as PackageDetailTab)} />
      <div className={styles.tabsContent}>
        {tab === 'overview' && (
          <div className={styles.content}>
            <div className={styles.grid}>
              <BenefitItem icon={Database} label="Data" value={packageData(pkg)} />
              <BenefitItem icon={Phone} label="Gọi thoại" value={pkg.call_desc} />
              <BenefitItem icon={MessageSquare} label="SMS" value={pkg.sms_desc} />
              <BenefitItem icon={Gauge} label="Tốc độ" value={pkg.speed_desc} />
              <BenefitItem icon={Users} label="Đối tượng áp dụng" value={pkg.audience || null} />
              <BenefitItem icon={Calendar} label="Hiệu lực áp dụng" value={packageValidity(pkg)} />
            </div>
            {pkg.description
              ?.replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .trim() ? (
              <div dangerouslySetInnerHTML={{ __html: pkg.description }} />
            ) : (
              <div className={styles.empty}>
                <PackageOpen aria-hidden="true" />
                <p>
                  {summary ||
                    'Thông tin gói cước đang được cập nhật. Liên hệ để được tư vấn gói phù hợp.'}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'benefits' &&
          (benefits.length ? (
            <ul className={styles.list}>
              {benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <PackageOpen aria-hidden="true" />
              <p>Gói cước hiện chưa có ưu đãi kèm theo.</p>
            </div>
          ))}

        {tab === 'terms' && (
          <ul className={styles.list}>
            <li>Chu kỳ gói cước: {packageDuration(pkg)}, tự động gia hạn nếu tài khoản đủ tiền.</li>
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
  if (!value?.trim()) return null;
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
