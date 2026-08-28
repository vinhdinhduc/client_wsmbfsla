'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination as SwiperPagination } from 'swiper/modules';
import { slidersApi } from '@/lib/api/sliders';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface SliderZoneProps {
  zoneCode: string;
  /** Ti le khung hinh cua slide - vd 'aspect-[21/9]' cho banner, 'aspect-[3/1]' cho partners. */
  aspectClassName?: string;
  className?: string;
}

/**
 * Component dung chung cho ca 3 zone (hero_banner/partners/testimonials, muc 7 dau
 * bai) - tu goi GET /api/public/sliders/:zoneCode va render bang Swiper.js theo dung
 * animation_type/autoplay cau hinh tu Admin (khong hard-code).
 */
export function SliderZone({ zoneCode, aspectClassName = 'aspect-[21/9]', className }: SliderZoneProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['slider-zone', zoneCode],
    queryFn: () => slidersApi.getByZoneCode(zoneCode),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className={`w-full animate-pulse rounded-lg bg-neutral-100 ${aspectClassName} ${className ?? ''}`} />;
  }

  if (!data || data.items.length === 0) return null;

  const effect = data.animation_type === 'fade' ? 'fade' : data.animation_type === 'zoom' ? 'zoom' : 'slide';

  return (
    <Swiper
      modules={[Autoplay, EffectFade, Navigation, SwiperPagination]}
      effect={effect === 'fade' ? 'fade' : undefined}
      fadeEffect={{ crossFade: true }}
      navigation={data.items.length > 1}
      pagination={data.items.length > 1 ? { clickable: true } : false}
      autoplay={
        data.autoplay_enabled
          ? { delay: data.autoplay_speed_ms, disableOnInteraction: false }
          : false
      }
      loop={data.items.length > 1}
      className={`w-full overflow-hidden rounded-lg ${className ?? ''}`}
    >
      {data.items.map((item) => {
        const slideContent = (
          <div className={`relative w-full ${aspectClassName}`}>
            <Image
              src={item.image_url}
              alt={item.title ?? 'MobiFone Sơn La'}
              fill
              sizes="100vw"
              priority
              className={effect === 'zoom' ? 'object-cover transition-transform duration-[5000ms] ease-linear hover:scale-110' : 'object-cover'}
            />
            {(item.title || item.caption) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
                {item.title && <p className="font-heading text-lg font-semibold">{item.title}</p>}
                {item.caption && <p className="text-sm opacity-90">{item.caption}</p>}
              </div>
            )}
          </div>
        );
        return (
          <SwiperSlide key={item.id}>
            {item.link_url ? <Link href={item.link_url}>{slideContent}</Link> : slideContent}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
