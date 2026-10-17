'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';

/** Announcement bar; promotional dialogs are managed in /admin/promotions. */
export function CampaignNotices() {
  const { data } = useQuery({
    queryKey: ['public-settings'], queryFn: () => settingsApi.listPublic(), staleTime: 300_000,
  });
  const now = Date.now();
  const active = Boolean(data?.announcement_text) &&
    (!data?.announcement_starts_at || Date.parse(data.announcement_starts_at) <= now) &&
    (!data?.announcement_ends_at || Date.parse(data.announcement_ends_at) >= now);
  if (!active) return null;
  return <aside style={{ padding: '8px 16px', textAlign: 'center', background: '#0066b3', color: 'white' }}>
    {data?.announcement_url
      ? <Link style={{ color: 'inherit' }} href={data.announcement_url}>{data.announcement_text}</Link>
      : data?.announcement_text}
  </aside>;
}
