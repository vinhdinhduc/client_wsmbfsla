import { env } from '@/lib/env';

const apiOrigin = new URL(env.NEXT_PUBLIC_API_URL).origin;

/** Ghép duy nhất tại frontend; hỗ trợ blob/data và URL CDN bên ngoài. */
export function assetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  const base = (env.NEXT_PUBLIC_ASSET_BASE_URL || apiOrigin).replace(/\/+$/, '');
  return `${base}/${value.replace(/^\/+/, '')}`;
}
