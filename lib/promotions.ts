import type { PublicPromotion } from '@/lib/api/promotions';

const STORAGE_PREFIX = 'mfsl_promotion_v1_';
const memory = new Map<number, { day: string; visit: boolean }>();

export function vietnamDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function normalizePromotionPath(path: string): string {
  return path.split(/[?#]/)[0].replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}

export function isPromotionEligible(
  promotion: PublicPromotion, path: string, device: 'desktop' | 'mobile', now = Date.now(),
): boolean {
  return promotion.is_active &&
    (!promotion.start_at || Date.parse(promotion.start_at) <= now) &&
    (!promotion.end_at || Date.parse(promotion.end_at) > now) &&
    (promotion.device === 'all' || promotion.device === device) &&
    (!promotion.target_pages.length || promotion.target_pages.some(
      (page) => normalizePromotionPath(page) === normalizePromotionPath(path),
    ));
}

export function canShowPromotion(promotion: PublicPromotion): boolean {
  const key = `${STORAGE_PREFIX}${promotion.id}`;
  let seenVisit = memory.get(promotion.id)?.visit ?? false;
  let seenDay = memory.get(promotion.id)?.day;
  try { seenVisit ||= sessionStorage.getItem(key) === '1'; } catch { /* Memory works without storage. */ }
  try { seenDay = localStorage.getItem(key) || seenDay; } catch { /* Private browser settings. */ }
  if (promotion.frequency === 'visit') return !seenVisit;
  if (promotion.frequency === 'daily') return seenDay !== vietnamDay();
  return !seenDay;
}

/** Record the impression, including dismissal without opening the gift. */
export function rememberPromotion(promotion: PublicPromotion): void {
  const key = `${STORAGE_PREFIX}${promotion.id}`;
  const day = vietnamDay();
  memory.set(promotion.id, { day, visit: true });
  try { sessionStorage.setItem(key, '1'); } catch { /* Memory fallback. */ }
  try { localStorage.setItem(key, day); } catch { /* Memory fallback. */ }
}

export function safePromotionLink(value: string | null): string | null {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch { return null; }
}

export function promotionVisitId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
