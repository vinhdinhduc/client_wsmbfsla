import type { Package } from '@/types/product';

export const packageBadgeLabels = { hot: 'Hot', new: 'Mới', bestseller: 'Bán chạy' };
export function packageDuration(pkg: Package) {
  return pkg.duration_value > 0
    ? `${pkg.duration_value} ${pkg.duration_unit === 'thang' ? 'tháng' : 'ngày'}`
    : '';
}
export function packageData(pkg: Package) {
  if (pkg.unlimited_data) return 'Không giới hạn';
  return (
    pkg.data_desc?.trim() ||
    [
      pkg.data_per_day_gb ? `${pkg.data_per_day_gb}GB/ngày` : '',
      pkg.data_per_cycle_gb ? `${pkg.data_per_cycle_gb}GB/chu kỳ` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  );
}
export function packageBenefits(value: string[] | string | null | undefined) {
  return (Array.isArray(value) ? value : [value || ''])
    .flatMap((line) => line.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
}
export function packageGroupLabel(pkg: Package) {
  if (pkg.subscription_type === 'prepaid') return 'Trả trước';
  if (pkg.subscription_type === 'postpaid') return 'Trả sau';
  return { hot: 'Gói nổi bật', tra_truoc: 'Trả trước', tra_sau: 'Trả sau', wifi_5g: 'Wifi 5G' }[
    pkg.group_type
  ];
}
export function packageValidity(pkg: Package) {
  const format = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };
  const from = format(pkg.effective_from),
    to = format(pkg.effective_to);
  return from && to ? `Từ ${from} đến ${to}` : from ? `Từ ${from}` : to ? `Đến ${to}` : '';
}
