import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { Providers } from '@/contexts/providers';
import { AnalyticsScripts } from '@/components/shared/AnalyticsScripts';
import { env } from '@/lib/env';
import './globals.scss';
import 'leaflet/dist/leaflet.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: 'MobiFone Sơn La',
    template: '%s | MobiFone Sơn La',
  },
  description: 'MobiFone Chi nhánh Sơn La - Sim số đẹp, gói cước, giải pháp số cho doanh nghiệp và cá nhân.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'MobiFone Chi nhánh Sơn La', url: env.NEXT_PUBLIC_SITE_URL, logo: `${env.NEXT_PUBLIC_SITE_URL}/logo.png`, contactPoint: { '@type': 'ContactPoint', telephone: '18001090', contactType: 'customer service', areaServed: 'VN' } }).replace(/</g, '\\u003c') }} />
        <Providers>
          {children}
          <AnalyticsScripts />
        </Providers>
      </body>
    </html>
  );
}
