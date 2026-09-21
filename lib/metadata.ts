import { Metadata } from 'next';
import { env } from '@/lib/env';
import { assetUrl } from '@/lib/assets';

const SITE_NAME = 'MobiFone Sơn La';

interface BuildMetadataArgs {
  title: string;
  description?: string | null;
  image?: string | null;
  path: string;
}

/**
 * Helper dung chung cho generateMetadata() cua tung trang chi tiet (goi cuoc, giai
 * phap, tin tuc...) - dam bao chia se link qua Zalo/Facebook hien dung anh + tieu
 * de (muc 12.1 dau bai).
 */
export function buildMetadata({ title, description, image, path }: BuildMetadataArgs): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const desc = description?.trim() || `${title} - ${SITE_NAME}, tổng đài chăm sóc khách hàng.`;
  const url = `${env.NEXT_PUBLIC_SITE_URL}${path}`;

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      images: image ? [{ url: assetUrl(image)! }] : undefined,
      locale: 'vi_VN',
      type: 'website',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description: desc,
      images: image ? [assetUrl(image)!] : undefined,
    },
  };
}
