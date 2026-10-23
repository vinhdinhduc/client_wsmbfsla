import { z } from 'zod';

/**
 * Toan bo bien moi truong NEXT_PUBLIC_* bat buoc duoc validate ngay luc khoi dong
 * (import lan dau) bang zod - fail som neu thieu, thay vi loi mo ho luc runtime
 * o mot component nao do xa lap trinh (muc 14 dau bai).
 *
 * TUYET DOI khong dat bat ky secret key nao (JWT_SECRET, ANTHROPIC_API_KEY,
 * RECAPTCHA_SECRET_KEY...) vao day - cac key do chi ton tai o backend.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.union([
    z.string().url({ message: 'NEXT_PUBLIC_API_URL phải là một URL hợp lệ' }),
    z.string().regex(/^\/(?!\/)/),
  ]).default('/api'),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().min(1, 'Thiếu NEXT_PUBLIC_RECAPTCHA_SITE_KEY'),
  NEXT_PUBLIC_GA4_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional().default(''),
  NEXT_PUBLIC_SITE_URL: z.string().url({ message: 'NEXT_PUBLIC_SITE_URL phải là một URL hợp lệ' }),
  NEXT_PUBLIC_ASSET_BASE_URL: z.union([z.string().url(), z.literal('')]).optional().default(''),
  NEXT_PUBLIC_INITIAL_LOADER_ENABLED: z.enum(['true', 'false']).default('true'),
  NEXT_PUBLIC_ADMIN_INITIAL_LOADER_ENABLED: z.enum(['true', 'false']).default('false'),
});

function loadClientEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ASSET_BASE_URL: process.env.NEXT_PUBLIC_ASSET_BASE_URL,
    NEXT_PUBLIC_INITIAL_LOADER_ENABLED: process.env.NEXT_PUBLIC_INITIAL_LOADER_ENABLED,
    NEXT_PUBLIC_ADMIN_INITIAL_LOADER_ENABLED: process.env.NEXT_PUBLIC_ADMIN_INITIAL_LOADER_ENABLED,
  });

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Biến môi trường frontend không hợp lệ:', parsed.error.flatten().fieldErrors);
    throw new Error('Cấu hình biến môi trường (.env) không hợp lệ - xem log bên trên.');
  }

  return parsed.data;
}

export const env = loadClientEnv();
