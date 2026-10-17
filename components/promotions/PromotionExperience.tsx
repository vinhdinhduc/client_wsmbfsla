'use client';

import { CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Gift, X } from 'lucide-react';
import type { PromotionEvent, PublicPromotion } from '@/lib/api/promotions';
import { assetUrl } from '@/lib/assets';
import { safePromotionLink } from '@/lib/promotions';
import styles from './PromotionExperience.module.scss';

export interface PromotionExperienceProps {
  promotion: PublicPromotion;
  preview?: boolean;
  onDismiss: () => void;
  onEvent?: (event: PromotionEvent) => void;
}

export function PromotionExperience({ promotion, preview = false, onDismiss, onEvent }: PromotionExperienceProps) {
  const [phase, setPhase] = useState<'gift' | 'opening' | 'open'>(promotion.effect_type === 'popup' ? 'open' : 'gift');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const events = useRef(new Set<PromotionEvent>());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const couponRef = useRef(promotion.coupon_code);
  couponRef.current = promotion.coupon_code;
  const titleId = useId();
  const contentId = useId();
  const ctaLink = safePromotionLink(promotion.cta_link);
  const bannerUrl = promotion.image_url?.startsWith('blob:') && preview
    ? promotion.image_url : assetUrl(safePromotionLink(promotion.image_url));

  const emit = useCallback((event: PromotionEvent) => {
    if (preview || events.current.has(event)) return;
    events.current.add(event);
    onEventRef.current?.(event);
  }, [preview]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    emit('impression');
    if (promotion.effect_type === 'popup') emit('open');
    // One experience represents one impression, including Strict Mode replay.
  }, [emit, promotion.effect_type]);

  useEffect(() => {
    if (promotion.effect_type === 'popup') setPhase('open');
  }, [promotion.effect_type]);

  useEffect(() => {
    if (phase !== 'opening') return;
    const timeout = window.setTimeout(() => setPhase('open'), reducedMotion ? 0 : 450);
    return () => window.clearTimeout(timeout);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'open') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [phase]);

  useEffect(() => { setImageFailed(false); }, [bannerUrl]);
  useEffect(() => { setCopied(false); setCopyError(false); }, [promotion.coupon_code]);

  async function copyCoupon() {
    const coupon = promotion.coupon_code;
    if (!coupon) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(coupon);
      else {
        const input = document.createElement('textarea');
        input.value = coupon;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        (dialogRef.current || document.body).appendChild(input);
        input.select();
        const success = document.execCommand('copy');
        input.remove();
        if (!success) throw new Error('Clipboard unavailable');
      }
      if (couponRef.current === coupon) { setCopied(true); setCopyError(false); }
    } catch {
      setCopyError(true);
    }
  }

  return <>
    {phase !== 'open' && <aside
      className={`${styles.giftPlacement} ${styles[promotion.position]}`}
      data-promotion-effect={promotion.effect_type}
      data-promotion-phase={phase}
      aria-label="Quà khuyến mại"
    >
      <button type="button" className={styles.dismissGift} onClick={onDismiss} aria-label="Đóng hộp quà"><X size={18} /></button>
      <button type="button" className={`${styles.giftButton} ${styles[promotion.effect_type]} ${phase === 'opening' ? styles.opening : ''}`}
        aria-label="Mở hộp quà khuyến mại" disabled={phase === 'opening'} onClick={() => { emit('open'); setPhase('opening'); }}>
        <span className={styles.giftArt} aria-hidden="true">
          <span className={styles.halo} />
          <span className={styles.bowLeft} /><span className={styles.bowRight} />
          <span className={styles.box}><span className={styles.ribbon} /></span>
          <span className={styles.lid}><span className={styles.ribbon} /></span>
          <span className={styles.sparkle}>✦</span><span className={styles.sparkleSmall}>✦</span>
        </span>
        <span className={styles.giftLabel}>Bạn có một món quà!</span>
        <span className={styles.giftHint}>{phase === 'opening' ? 'Đang mở quà…' : 'Bấm để mở quà'}</span>
      </button>
      {phase === 'opening' && !reducedMotion && <Confetti />}
    </aside>}
    <dialog ref={dialogRef} className={styles.dialog} aria-modal="true" aria-labelledby={titleId} aria-describedby={contentId}
      data-promotion-effect={promotion.effect_type} data-promotion-backdrop=""
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      {phase === 'open' && <article className={styles.card}>
        <div className={styles.cardHeading}>
          <button type="button" className={styles.close} aria-label="Đóng khuyến mại" onClick={onDismiss} autoFocus><X size={22} /></button>
          <span className={styles.kicker}><Gift size={18} aria-hidden="true" /> Quà tặng dành cho bạn</span>
          <h2 id={titleId}>{promotion.title}</h2>
        </div>
        <div className={styles.cardBody}>
          {bannerUrl && !imageFailed && <div className={styles.banner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt={`Ưu đãi: ${promotion.title}`} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
          </div>}
          <p id={contentId} className={styles.content}>{promotion.content}</p>
          {promotion.coupon_code && <div className={styles.coupon}>
            <div><span>Mã ưu đãi</span><code>{promotion.coupon_code}</code></div>
            <button type="button" onClick={copyCoupon} aria-label="Sao chép mã">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Đã chép' : 'Sao chép'}</button>
          </div>}
          <span role="status" className={styles.copyStatus}>{copyError ? 'Không thể sao chép. Bạn có thể chọn và chép mã trực tiếp.' : copied ? 'Đã sao chép mã' : ''}</span>
          {ctaLink && promotion.cta_text && <a href={ctaLink} className={styles.cta} onClick={(event) => { if (preview) event.preventDefault(); else emit('cta'); }}>{promotion.cta_text}</a>}
          {preview && <p className={styles.previewNote}>Chế độ xem trước · Không ghi nhận lượt xem hoặc giới hạn tần suất</p>}
        </div>
      </article>}
    </dialog>
  </>;
}

function Confetti() {
  return <div className={styles.confetti} data-promotion-confetti="" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <i key={index} style={{
      '--angle': `${index * 20}deg`, '--distance': `${90 + index % 4 * 25}px`, '--hue': `${index * 47}deg`,
    } as CSSProperties} />)}
  </div>;
}
