import { z } from 'zod';
import type { Promotion, PromotionInput } from '@/lib/api/promotions';

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** datetime-local always represents Vietnam time, regardless of the browser's timezone. */
export function toVietnamInput(value: string | null): string {
  if (!value) return '';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp + VIETNAM_OFFSET_MS).toISOString().slice(0, 16)
    : '';
}

export function fromVietnamInput(value: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(`${value}:00+07:00`);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function isSafeLink(value: string): boolean {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseTargetPaths(value: string): string[] {
  return [...new Set(value.split(/[\n,]+/).map((path) => path.trim()).filter(Boolean))];
}

export const promotionFormSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên chương trình').max(160, 'Tối đa 160 ký tự'),
  title: z.string().trim().min(1, 'Nhập tiêu đề hiển thị').max(255, 'Tối đa 255 ký tự'),
  content: z.string().trim().min(1, 'Nhập nội dung khuyến mại').max(10000, 'Tối đa 10.000 ký tự'),
  image_url: z.string().trim().max(2000, 'Tối đa 2.000 ký tự').refine(isSafeLink, 'Dùng đường dẫn /... hoặc URL http/https'),
  coupon_code: z.string().trim().max(100, 'Tối đa 100 ký tự'),
  cta_text: z.string().trim().max(100, 'Tối đa 100 ký tự'),
  cta_link: z.string().trim().max(2000, 'Tối đa 2.000 ký tự').refine(isSafeLink, 'Dùng đường dẫn /... hoặc URL http/https'),
  effect_type: z.enum(['bounce', 'shake', 'popup']),
  position: z.enum(['center', 'bottom_right', 'bottom_left']),
  trigger_type: z.enum(['immediate', 'delay', 'scroll']),
  trigger_value: z.coerce.number().finite('Nhập một số hợp lệ'),
  page_scope: z.enum(['all', 'home', 'specific']),
  paths: z.string(),
  frequency: z.enum(['visit', 'daily', 'once']),
  device: z.enum(['desktop', 'mobile', 'all']),
  start_at: z.string(),
  end_at: z.string(),
  is_active: z.boolean(),
}).superRefine((values, context) => {
  if (Boolean(values.cta_link) !== Boolean(values.cta_text)) {
    context.addIssue({ code: 'custom', path: [values.cta_link ? 'cta_text' : 'cta_link'], message: 'Nhập cả nội dung nút và đường dẫn nút' });
  }
  if (values.trigger_type !== 'immediate') {
    const maximum = values.trigger_type === 'delay' ? 3600 : 100;
    if (!Number.isInteger(values.trigger_value) || values.trigger_value < 0 || values.trigger_value > maximum) {
      context.addIssue({ code: 'custom', path: ['trigger_value'], message: `Nhập số nguyên từ 0 đến ${maximum}` });
    }
  }
  if (values.page_scope === 'specific') {
    const paths = parseTargetPaths(values.paths);
    if (!paths.length || paths.length > 100 || paths.some((path) =>
      path.length > 2000 || !path.startsWith('/') || path.startsWith('//') || /[\s\\?#]/.test(path))) {
      context.addIssue({ code: 'custom', path: ['paths'], message: 'Nhập 1–100 đường dẫn bắt đầu bằng /, không có tên miền, tham số hoặc dấu #. Mỗi đường dẫn tối đa 2.000 ký tự.' });
    }
  }
  for (const key of ['start_at', 'end_at'] as const) {
    if (values[key] && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values[key]) || !fromVietnamInput(values[key]))) {
      context.addIssue({ code: 'custom', path: [key], message: 'Ngày giờ không hợp lệ' });
    }
  }
  if (values.start_at && values.end_at && values.end_at <= values.start_at) {
    context.addIssue({ code: 'custom', path: ['end_at'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
  }
});

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export function promotionDefaults(promotion?: Promotion): PromotionFormValues {
  return {
    name: promotion?.name ?? '',
    title: promotion?.title ?? 'Bạn nhận được một món quà!',
    content: promotion?.content ?? '',
    image_url: promotion?.image_url ?? '',
    coupon_code: promotion?.coupon_code ?? '',
    cta_text: promotion?.cta_text ?? '',
    cta_link: promotion?.cta_link ?? '',
    effect_type: promotion?.effect_type ?? 'bounce',
    position: promotion?.position ?? 'bottom_right',
    trigger_type: promotion?.trigger_type ?? 'delay',
    trigger_value: promotion?.trigger_value ?? 3,
    page_scope: !promotion?.target_pages.length ? 'all' : promotion.target_pages.length === 1 && promotion.target_pages[0] === '/' ? 'home' : 'specific',
    paths: promotion?.target_pages.join('\n') ?? '',
    frequency: promotion?.frequency ?? 'daily',
    device: promotion?.device ?? 'all',
    start_at: toVietnamInput(promotion?.start_at ?? null),
    end_at: toVietnamInput(promotion?.end_at ?? null),
    is_active: promotion?.is_active ?? false,
  };
}

export function toPromotionInput(values: PromotionFormValues): PromotionInput {
  const { page_scope, paths, ...fields } = values;
  return {
    ...fields,
    image_url: values.image_url || null,
    coupon_code: values.coupon_code || null,
    cta_text: values.cta_text || null,
    cta_link: values.cta_link || null,
    trigger_value: values.trigger_type === 'immediate' ? 0 : values.trigger_value,
    target_pages: page_scope === 'all' ? [] : page_scope === 'home' ? ['/'] : parseTargetPaths(paths),
    start_at: fromVietnamInput(values.start_at),
    end_at: fromVietnamInput(values.end_at),
  };
}

export function formatPromotionDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(value)) : 'Không giới hạn';
}
