'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination as SwiperPagination } from 'swiper/modules';
import { slidersApi } from '@/lib/api/sliders';
import { assetUrl } from '@/lib/assets';
import styles from './SliderZone.module.scss';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface SliderZoneProps {
  zoneCode: string;
  /** Named aspect variants keep layout sizing inside the slider module. */
  aspect?: 'hero' | 'partners';
  className?: string;
}

/**
 * Component dung chung cho ca 3 zone (hero_banner/partners/testimonials, muc 7 dau
 * bai) - tu goi GET /api/public/sliders/:zoneCode va render bang Swiper.js theo dung
 * animation_type/autoplay cau hinh tu Admin (khong hard-code).
 */
export function SliderZone({ zoneCode, aspect = 'hero', className }: SliderZoneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ['slider-zone', zoneCode],
    queryFn: () => slidersApi.getByZoneCode(zoneCode),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div
        className={`${styles.loading} ${aspect === 'partners' ? styles.aspectPartners : styles.aspectHero} ${className ?? ''}`}
      />
    );
  }

  if (!data || data.items.length === 0) return null;

  const effect =
    data.animation_type === 'fade' ? 'fade' : data.animation_type === 'zoom' ? 'zoom' : 'slide';
  const autoplayDelay = Math.max(data.autoplay_speed_ms || 5000, 1000);

  return (
    <Swiper
      modules={[A11y, Autoplay, EffectFade, Keyboard, Navigation, SwiperPagination]}
      keyboard={{ enabled: true }}
      a11y={{ enabled: true, prevSlideMessage: 'Ảnh trước', nextSlideMessage: 'Ảnh tiếp theo' }}
      effect={effect === 'fade' ? 'fade' : 'slide'}
      fadeEffect={{ crossFade: true }}
      slidesPerView={1}
      speed={700}
      navigation={data.items.length > 1}
      pagination={data.items.length > 1 ? { clickable: true } : false}
      autoplay={
        data.autoplay_enabled && !reducedMotion
          ? { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true }
          : false
      }
      loop={data.items.length > 1}
      className={`${styles.root} ${className ?? ''}`}
    >
      {data.items.map((item, index) => {
        const slideContent = (
          <div
            className={`${styles.slide} ${aspect === 'partners' ? styles.aspectPartners : styles.aspectHero}`}
          >
            <picture>
            {item.mobile_image_url && <source media="(max-width: 640px)" srcSet={assetUrl(item.mobile_image_url)!} />}
            <Image
              src={assetUrl(item.image_url)!}
              alt={item.alt_text || item.title || 'MobiFone Sơn La'}
              fill
              sizes="100vw"
              quality={82}
              priority={index === 0}
              className={zoneCode === 'partners' ? styles.partnerImage : effect === 'zoom' ? styles.imageZoom : styles.image}
            />
            </picture>
            {(item.title || item.caption) && (
              <div className={styles.caption}>
                {item.title && <p className={styles.captionTitle}>{item.title}</p>}
                {item.caption && <p className={styles.captionText}>{item.caption}</p>}
              </div>
            )}
            {zoneCode === 'testimonials' && (item.person_name || item.rating) && <div className={styles.testimonialMeta}><span aria-label={`${item.rating || 5} trên 5 sao`}>{'★'.repeat(item.rating || 5)}</span><strong>{item.person_name}</strong><small>{item.job_title}</small></div>}
          </div>
        );
        return (
          <SwiperSlide key={item.id}>
            {item.link_url ? <Link href={item.link_url} target={item.open_new_tab ? '_blank' : undefined} rel={item.open_new_tab ? 'noopener noreferrer' : undefined}>{slideContent}</Link> : slideContent}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
