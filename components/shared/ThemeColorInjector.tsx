'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';

function darken(hex: string, amount = 0.2): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Trang chu/toan bo Public doc theme_primary_color tu GET /api/public/settings
 * thay vi hard-code (muc 6.1 dau bai) - ghi de truc tiep CSS variable
 * --color-primary (va tinh lai --color-primary-dark) de doi mau ma khong can
 * sua code hay rebuild lai giao dien.
 */
export function ThemeColorInjector() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.listPublic(),
    staleTime: 300_000,
  });

  useEffect(() => {
    const color = settings?.theme_primary_color;
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-dark', darken(color));
  }, [settings]);

  return null;
}
