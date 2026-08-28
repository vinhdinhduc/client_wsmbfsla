'use client';

import { useCallback, useEffect, useState } from 'react';
import { env } from '@/lib/env';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SCRIPT_ID = 'recaptcha-v3-script';

/**
 * reCAPTCHA v3 la invisible - khong hien captcha thu cong cho khach (muc 16 dau
 * bai). Hook nay tu nap script mot lan, cho ready() roi tra ve mot ham
 * getToken(action) de lay token ngam truoc khi submit form.
 */
export function useRecaptcha() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) {
      window.grecaptcha?.ready(() => setIsReady(true));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.onload = () => window.grecaptcha?.ready(() => setIsReady(true));
    document.body.appendChild(script);
  }, []);

  const getToken = useCallback(async (action: string): Promise<string> => {
    if (!window.grecaptcha) throw new Error('reCAPTCHA chưa sẵn sàng, vui lòng thử lại sau giây lát');
    return window.grecaptcha.execute(env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action });
  }, []);

  return { isReady, getToken };
}
