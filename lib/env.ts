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
  NEXT_PUBLIC_API_URL: z.string().url({ message: 'NEXT_PUBLIC_API_URL phai la mot URL hop le' }),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().min(1, 'Thieu NEXT_PUBLIC_RECAPTCHA_SITE_KEY'),
  NEXT_PUBLIC_GA4_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional().default(''),
  NEXT_PUBLIC_SITE_URL: z.string().url({ message: 'NEXT_PUBLIC_SITE_URL phai la mot URL hop le' }),
});

function loadClientEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Bien moi truong frontend khong hop le:', parsed.error.flatten().fieldErrors);
    throw new Error('Cau hinh bien moi truong (.env) khong hop le - xem log ben tren.');
  }

  return parsed.data;
}

export const env = loadClientEnv();
