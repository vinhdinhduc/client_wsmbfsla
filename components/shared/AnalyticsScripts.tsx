'use client';

import Script from 'next/script';
import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';
import { settingsApi } from '@/lib/api/settings';

/**
 * Nhung GA4 (gtag.js) + Meta Pixel qua <script> dong. Muc 12.1 dau bai mo ta ID lay
 * tu GET /api/public/settings (ga4_id, fb_pixel_id) - nhung PUBLIC_SETTING_KEYS o
 * backend hien chi gom 6 khoa co dinh (site_name, site_logo, hotline,
 * theme_primary_color, home_banner, ai_chatbot_enabled) va KHONG co ga4_id/
 * fb_pixel_id. Vi vay component nay dung truc tiep bien moi truong
 * NEXT_PUBLIC_GA4_ID/NEXT_PUBLIC_FB_PIXEL_ID (dung nhu vai tro "fallback" da
 * duoc dinh nghia san trong .env.example).
 */
export function AnalyticsScripts() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });
  const ga4Id = settings?.ga4_id || env.NEXT_PUBLIC_GA4_ID;
  const fbPixelId = settings?.fb_pixel_id || env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <>
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}');`}
          </Script>
        </>
      )}
      {fbPixelId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
