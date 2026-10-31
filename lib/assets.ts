import { env } from '@/lib/env';

const apiOrigin = env.NEXT_PUBLIC_API_URL.startsWith('/')
  ? ''
  : new URL(env.NEXT_PUBLIC_API_URL).origin;
const assetBase = (env.NEXT_PUBLIC_ASSET_BASE_URL || apiOrigin).replace(/\/+$/, '');

/** Ghép duy nhất tại frontend; hỗ trợ blob/data và URL CDN bên ngoài. */
export function assetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:)/i.test(value)) {
    try {
      const url = new URL(value);
      // Older database rows can contain the former backend IP as an absolute
      // URL. Uploads belong to this app, so serve them from the configured
      // asset host instead of sending Next's image optimizer to that stale IP.
      if (url.pathname === '/uploads' || url.pathname.startsWith('/uploads/')) {
        return `${assetBase}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  if (/^(blob:|data:)/i.test(value)) return value;
  return `${assetBase}/${value.replace(/^\/+/, '')}`;
}
