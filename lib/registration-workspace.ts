import { RegistrationGroup, RegistrationStatus } from '@/types/order';

export const REGISTRATION_WAIT_HOURS = 24;
export const REGISTRATION_OVERDUE_HOURS = 72;
export const REGISTRATION_STATUSES: { value: RegistrationStatus; label: string }[] = [
  { value: 'moi', label: 'Mới' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'huy', label: 'Hủy' },
];
export const registrationStatusLabel = (status: RegistrationStatus) =>
  REGISTRATION_STATUSES.find((option) => option.value === status)?.label ?? status;
export function canTransition(from: RegistrationStatus, to: RegistrationStatus, admin: boolean) {
  if (from === to) return true;
  return from === 'moi'
    ? ['dang_xu_ly', 'huy'].includes(to)
    : from === 'dang_xu_ly'
      ? ['hoan_thanh', 'huy'].includes(to)
      : from === 'hoan_thanh' && to === 'dang_xu_ly' && admin;
}
export function vietnamDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export const displayDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
export function parseDate(value: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split('/').map(Number);
  if (year < 1900 || year > 9999) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function datePreset(preset: string, now = new Date()) {
  const end = vietnamDate(now);
  const start = new Date(`${end}T00:00:00+07:00`);
  if (preset === '7' || preset === '30') start.setUTCDate(start.getUTCDate() - Number(preset) + 1);
  return {
    from: displayDate(preset === 'month' ? `${end.slice(0, 7)}-01` : vietnamDate(start)),
    to: displayDate(end),
  };
}
export const money = (value: number | string | undefined | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')}đ`;
export const productNames = (group: RegistrationGroup) =>
  group.items.map((item) => `${item.type === 'sim' ? 'SIM ' : ''}${item.reference_label}`);
export function registrationRows(groups: RegistrationGroup[]) {
  // String cells stay text; no user-provided value becomes an Excel formula.
  const text = (value: unknown) => {
    const result = String(value ?? '');
    return /^[=+\-@\t\r]/.test(result) ? `'${result}` : result;
  };
  return groups.map((group) => ({
    Mã: text(group.code || `#${group.id}`),
    'Khách hàng': text(group.customer_name),
    SĐT: text(group.phone),
    'Loại KH': group.customer_type === 'business' ? 'Doanh nghiệp' : 'Cá nhân',
    'Cửa hàng': group.store_id ?? '',
    'Sản phẩm': text(productNames(group).join(', ')),
    'Số sản phẩm': group.items.length,
    'Tổng tiền': Number(group.total_amount ?? 0),
    'Trạng thái': registrationStatusLabel(group.status),
    'Ngày tạo': displayDate(vietnamDate(new Date(group.created_at))),
  }));
}
