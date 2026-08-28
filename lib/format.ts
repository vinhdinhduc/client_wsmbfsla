/** Dinh dang so tien theo chuan Viet Nam, vd 160000 -> "160.000₫" */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Liên hệ';
  return `${new Intl.NumberFormat('vi-VN').format(value)}₫`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    date,
  );
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
