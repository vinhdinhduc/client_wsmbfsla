'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, buildApiUrl } from '@/lib/api/client';
import type { PromotionEvent, PublicPromotion } from '@/lib/api/promotions';
import { canShowPromotion, isPromotionEligible, promotionVisitId, rememberPromotion } from '@/lib/promotions';

const PromotionExperience = dynamic(() => import('./PromotionExperience').then((module) => module.PromotionExperience), { ssr: false });
const REFRESH_MS = 30_000;

export function PromotionWidget() {
  const pathname = usePathname();
  const [device, setDevice] = useState<'desktop' | 'mobile' | null>(null);
  const [active, setActive] = useState<{ promotion: PublicPromotion; visitId: string } | null>(null);
  const shownForPath = useRef(false);
  const sentEvents = useRef(new Set<string>());

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setDevice(media.matches ? 'mobile' : 'desktop');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    shownForPath.current = false;
    setActive(null);
  }, [pathname]);

  const { data } = useQuery({
    queryKey: ['public-promotions', pathname, device],
    queryFn: ({ signal }) => apiFetch<PublicPromotion[]>('/public/promotions', {
      params: { path: pathname, device }, cache: 'no-store', signal,
    }),
    enabled: Boolean(device),
    staleTime: 0,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const candidate = device && !active && data?.find((row) => isPromotionEligible(row, pathname, device) && canShowPromotion(row));
  // Polling must not restart a configured delay each time new API objects arrive.
  const candidateKey = candidate ? JSON.stringify([candidate.id, candidate.trigger_type, candidate.trigger_value, candidate.start_at, candidate.end_at, candidate.target_pages, candidate.device]) : '';
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;

  useEffect(() => {
    if (!candidateKey || !device || shownForPath.current) return;
    let ready = false;
    let disposed = false;
    const attempt = () => {
      const row = candidateRef.current;
      if (!row || disposed || !ready || shownForPath.current || document.visibilityState !== 'visible') return;
      // Wait until the initial curtain or another dialog no longer covers the gift.
      if (document.documentElement.dataset.initialLoader || document.querySelector('dialog[open]')) return;
      if (!isPromotionEligible(row, pathname, device) || !canShowPromotion(row)) return;
      shownForPath.current = true;
      setActive({ promotion: row, visitId: promotionVisitId() });
    };
    const onScroll = () => {
      const row = candidateRef.current;
      if (!row) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = scrollable <= 0 ? 100 : Math.max(0, window.scrollY) / scrollable * 100;
      if (percentage >= row.trigger_value) { ready = true; attempt(); }
    };
    const row = candidateRef.current;
    if (!row) return;
    const timer = row.trigger_type === 'delay'
      ? window.setTimeout(() => { ready = true; attempt(); }, row.trigger_value * 1000)
      : undefined;
    if (row.trigger_type === 'scroll') {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    } else if (row.trigger_type === 'immediate') { ready = true; attempt(); }
    const retry = window.setInterval(attempt, 400);
    document.addEventListener('visibilitychange', attempt);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearInterval(retry);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', attempt);
    };
  }, [candidateKey, device, pathname]);

  // Refresh configuration, and remove a campaign as soon as it becomes ineligible.
  useEffect(() => {
    if (!active || !device) return;
    if (!isPromotionEligible(active.promotion, pathname, device)) { setActive(null); return; }
    const current = data ? data.find((row) => row.id === active.promotion.id) : active.promotion;
    if (!current || !isPromotionEligible(current, pathname, device)) { setActive(null); return; }
    if (current !== active.promotion) setActive((value) => value && ({ ...value, promotion: current }));
    const end = current.end_at ? Date.parse(current.end_at) - Date.now() : null;
    if (end === null || end > 2_147_483_647) return;
    const timer = window.setTimeout(() => setActive(null), Math.max(0, end));
    return () => window.clearTimeout(timer);
  }, [active, data, device, pathname]);

  const track = useCallback((event: PromotionEvent) => {
    if (!active) return;
    if (event === 'impression') rememberPromotion(active.promotion);
    const key = `${active.visitId}:${event}`;
    if (sentEvents.current.has(key)) return;
    sentEvents.current.add(key);
    // keepalive lets CTA statistics reach the API during page navigation.
    void fetch(buildApiUrl(`/public/promotions/${active.promotion.id}/events`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, visit_id: active.visitId }), keepalive: true,
    }).catch(() => { /* Analytics must not interrupt the visitor. */ });
  }, [active]);

  if (!active) return null;
  return <PromotionExperience key={active.visitId} promotion={active.promotion} onDismiss={() => setActive(null)} onEvent={track} />;
}
