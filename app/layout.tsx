import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';
import { Providers } from '@/contexts/providers';
import { AnalyticsScripts } from '@/components/shared/AnalyticsScripts';
import { env } from '@/lib/env';
import './globals.css';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`}>
      <body className="font-body">
        <Providers>
          {children}
          <AnalyticsScripts />
        </Providers>
      </body>
    </html>
  );
}
