/** Dinh dang so tien theo chuan Viet Nam, vd 160000 -> "160.000₫" */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'Liên hệ';
  return `${new Intl.NumberFormat('vi-VN').format(toPriceNumber(value))}₫`;
}

/** Convert API/localStorage prices to numbers before arithmetic. */
export function toPriceNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = value.trim().replace(/₫|đ/gi, '').replace(/\s/g, '');
  if (!normalized) return 0;

  // Vietnamese formatted prices use dots as thousands separators: "90.000".
  const digitsOnly = normalized.replace(/[^\d-]/g, '');
  const parsed = Number(digitsOnly);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
