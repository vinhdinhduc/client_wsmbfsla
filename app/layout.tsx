import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { Providers } from '@/contexts/providers';
import { AnalyticsScripts } from '@/components/shared/AnalyticsScripts';
import { env } from '@/lib/env';
import { initialLoaderBootstrap } from '@/lib/initial-loader';
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
    template: 'MobiFone Sơn La | %s',
  },
  description: 'MobiFone Chi nhánh Sơn La - Sim số đẹp, gói cước, giải pháp số cho doanh nghiệp và cá nhân.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'MobiFone Sơn La',
    description: 'MobiFone Chi nhánh Sơn La - Sim số đẹp, gói cước, giải pháp số cho doanh nghiệp và cá nhân.',
    images: [{ url: '/og-mobifone-sonla.png?v=2', width: 1200, height: 630, alt: 'MobiFone Sơn La' }],
    siteName: 'MobiFone Sơn La',
    locale: 'vi_VN',
    type: 'website',
  },
  themeColor: '#0066b3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: initialLoaderBootstrap(
              env.NEXT_PUBLIC_INITIAL_LOADER_ENABLED === 'true',
              env.NEXT_PUBLIC_ADMIN_INITIAL_LOADER_ENABLED === 'true',
            ),
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'MobiFone Chi nhánh Sơn La', url: env.NEXT_PUBLIC_SITE_URL, logo: `${env.NEXT_PUBLIC_SITE_URL}/logo.png`, contactPoint: { '@type': 'ContactPoint', telephone: '18001090', contactType: 'customer service', areaServed: 'VN' } }).replace(/</g, '\\u003c') }} />
        <Providers>
          {children}
          <AnalyticsScripts />
        </Providers>
      </body>
    </html>
  );
}
